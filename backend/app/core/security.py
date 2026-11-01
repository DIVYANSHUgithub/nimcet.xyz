from dataclasses import dataclass
from typing import Protocol
from urllib.parse import urlparse

import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError, PyJWKClientError

from app.core.config import Settings


class AuthNotConfigured(Exception):
    pass


class AuthProviderUnavailable(Exception):
    pass


class InvalidAccessToken(Exception):
    pass


@dataclass(frozen=True)
class VerifiedIdentity:
    subject: str
    issuer: str
    audience: str | list[str]


class TokenVerifier(Protocol):
    @property
    def configured(self) -> bool: ...

    def verify(self, token: str) -> VerifiedIdentity: ...


class SupabaseTokenVerifier:
    """Verify user access tokens with an explicitly configured algorithm and issuer."""

    _ASYMMETRIC_ALGORITHMS = {"ES256", "RS256", "PS256", "EdDSA"}

    def __init__(self, settings: Settings):
        self.settings = settings
        self._jwks_client: PyJWKClient | None = None

    @property
    def configured(self) -> bool:
        common = all(
            (
                self.settings.supabase_jwt_issuer,
                self.settings.supabase_jwt_audience,
                self.settings.supabase_jwt_mode,
                self.settings.supabase_jwt_algorithm,
            )
        )
        if not common:
            return False
        if self.settings.supabase_jwt_mode == "jwks":
            return bool(
                self.settings.supabase_url
                and self.settings.supabase_jwks_url
                and self.settings.supabase_jwt_algorithm in self._ASYMMETRIC_ALGORITHMS
                and self._valid_project_urls()
            )
        return bool(
            self.settings.supabase_jwt_mode == "hs256"
            and self.settings.supabase_jwt_algorithm == "HS256"
            and self.settings.supabase_jwt_secret
            and len(self.settings.supabase_jwt_secret.get_secret_value()) >= 32
        )

    def _valid_project_urls(self) -> bool:
        if not self.settings.supabase_url or not self.settings.supabase_jwks_url:
            return False
        project = urlparse(self.settings.supabase_url)
        issuer = urlparse(self.settings.supabase_jwt_issuer or "")
        jwks = urlparse(self.settings.supabase_jwks_url)
        try:
            same_port = project.port == issuer.port == jwks.port
        except ValueError:
            return False
        allowed_schemes = {"https"} if project.hostname not in {"localhost", "127.0.0.1"} else {"http", "https"}
        expected_issuer_path = f"{project.path.rstrip('/')}/auth/v1" if project.path else "/auth/v1"
        expected_jwks_path = f"{expected_issuer_path}/.well-known/jwks.json"
        return bool(
            project.scheme in allowed_schemes
            and project.hostname
            and issuer.scheme == project.scheme
            and issuer.hostname == project.hostname
            and not issuer.username
            and not issuer.password
            and not issuer.query
            and not issuer.fragment
            and issuer.path.rstrip("/") == expected_issuer_path.rstrip("/")
            and jwks.scheme == project.scheme
            and jwks.hostname == project.hostname
            and same_port
            and jwks.path.rstrip("/") == expected_jwks_path.rstrip("/")
            and not jwks.username
            and not jwks.password
            and not jwks.query
            and not jwks.fragment
        )

    def verify(self, token: str) -> VerifiedIdentity:
        if not self.configured:
            raise AuthNotConfigured

        try:
            header = jwt.get_unverified_header(token)
            algorithm = self.settings.supabase_jwt_algorithm
            if header.get("alg") != algorithm:
                raise InvalidAccessToken

            if self.settings.supabase_jwt_mode == "jwks":
                if self._jwks_client is None:
                    self._jwks_client = PyJWKClient(
                        self.settings.supabase_jwks_url,
                        cache_keys=True,
                        timeout=5,
                    )
                key = self._jwks_client.get_signing_key_from_jwt(token).key
            else:
                key = self.settings.supabase_jwt_secret.get_secret_value()

            claims = jwt.decode(
                token,
                key=key,
                algorithms=[algorithm],
                audience=self.settings.supabase_jwt_audience,
                issuer=self.settings.supabase_jwt_issuer,
                options={"require": ["exp", "iat", "sub", "iss", "aud"]},
            )
            subject = claims.get("sub")
            if not isinstance(subject, str) or not subject.strip():
                raise InvalidAccessToken
            audience = claims.get("aud")
            if not isinstance(audience, (str, list)):
                raise InvalidAccessToken
            return VerifiedIdentity(
                subject=subject,
                issuer=claims["iss"],
                audience=audience,
            )
        except AuthNotConfigured:
            raise
        except (PyJWKClientConnectionError, TimeoutError, OSError) as exc:
            raise AuthProviderUnavailable from exc
        except (jwt.PyJWTError, PyJWKClientError, KeyError, TypeError, ValueError) as exc:
            raise InvalidAccessToken from exc


class RoleResolver(Protocol):
    def roles_for(self, identity: VerifiedIdentity) -> frozenset[str]: ...


class StudentOnlyRoleResolver:
    """Safe Phase 2 default until a trusted role table is designed and migrated."""

    def roles_for(self, _identity: VerifiedIdentity) -> frozenset[str]:
        return frozenset({"student"})


@dataclass(frozen=True)
class Principal:
    user_id: str
    roles: frozenset[str]
