import json
from uuid import UUID
from urllib.request import Request,urlopen
from urllib.error import URLError

from app.services.supabase_headers import service_headers


class DirectoryUnavailable(Exception): pass
class DirectoryNotConfigured(DirectoryUnavailable): pass
class DirectoryUserMissing(Exception): pass


class AuthDirectory:
    """Server-only Supabase Auth reads with a deliberately small projection."""
    def __init__(self,settings): self.settings=settings

    def request(self,path):
        if not self.settings.supabase_admin_key or not self.settings.supabase_url:
            raise DirectoryNotConfigured
        key=self.settings.supabase_admin_key.get_secret_value()
        try:
            request=Request(self.settings.supabase_url.rstrip('/')+'/auth/v1/admin/users'+path,
                            headers=service_headers(key))
            with urlopen(request,timeout=10) as response:
                return json.loads(response.read(4*1024*1024))
        except URLError as error:
            if getattr(error,'code',None)==404: raise DirectoryUserMissing from None
            raise DirectoryUnavailable from None
        except (OSError,ValueError): raise DirectoryUnavailable from None

    @staticmethod
    def project(user):
        if not isinstance(user,dict): raise DirectoryUnavailable
        try: user_id=str(UUID(user['id']))
        except (ValueError,TypeError,KeyError): raise DirectoryUnavailable from None
        metadata=user.get('user_metadata') or {}
        if not isinstance(metadata,dict): metadata={}
        return {'id':user_id,'email':user.get('email'),'name':str(metadata.get('full_name') or metadata.get('name') or '')[:200],
                'email_verified':bool(user.get('email_confirmed_at')),'created_at':user.get('created_at'),
                'last_sign_in_at':user.get('last_sign_in_at')}

    def page(self,page):
        result=self.request(f'?page={page}&per_page=30')
        if not isinstance(result,dict) or not isinstance(result.get('users'),list): raise DirectoryUnavailable
        users=result['users']
        return {'items':[self.project(u) for u in users],'page':page,'has_more':len(users)==30}

    def get(self,user_id):
        result=self.request('/'+str(user_id))
        if not isinstance(result,dict): raise DirectoryUnavailable
        user=self.project(result.get('user',result))
        if user['id']!=str(user_id): raise DirectoryUnavailable
        return user
