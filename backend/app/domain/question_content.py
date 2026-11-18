from urllib.parse import urlsplit

from pydantic import ValidationError

from app.schemas.content import ContentBlock


def linked_image(url, alt):
    if not isinstance(url, str):
        return None
    url = url.strip()
    try:
        parsed = urlsplit(url)
        if parsed.scheme in {'http', 'https'} and parsed.hostname and parsed.username is None and parsed.password is None:
            return {'type': 'legacy_image', 'url': url, 'alt': alt if isinstance(alt, str) else 'Question illustration'}
    except ValueError:
        pass
    return None


def statement_blocks(question):
    """Read the statement from a JSONB block array or a statement object."""
    if isinstance(question, dict):
        blocks = question.get('blocks', question.get('statement'))
        if blocks is None:
            if 'type' in question:
                blocks = [question]
            else:
                prompt = question.get('text')
                blocks = [{'type': 'text', 'text': prompt}] if isinstance(prompt, str) and prompt.strip() else []
                image = linked_image(question.get('image_url') or question.get('imageUrl'), question.get('alt'))
                if image:
                    blocks.append(image)
    else:
        blocks = question
    if not isinstance(blocks, list):
        return []
    result = []
    for block in blocks:
        if isinstance(block, dict) and block.get('type') in ('image', 'legacy_image') and not block.get('media_id'):
            image = linked_image(block.get('url'), block.get('alt'))
            if image:
                result.append(image)
            continue
        try:
            result.append(ContentBlock.model_validate(block).model_dump(mode='json', exclude_defaults=True))
        except ValidationError:
            continue
    return result


def statement_text(question, blocks):
    if isinstance(question, str):
        return question
    if blocks:
        return '\n'.join(block['text'] for block in blocks if block['type'] in {'text', 'latex'}) or '[Illustrated question]'
    if isinstance(question, dict) and isinstance(question.get('text'), str):
        return question['text']
    return ''


def option_ids(options):
    return [
        option['id'] if isinstance(option, dict) and isinstance(option.get('id'), str) and option['id']
        else f'option-{index}'
        for index, option in enumerate(options or [])
    ]
