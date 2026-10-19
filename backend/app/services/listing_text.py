"""Display text for listings."""
import re

_TITLE_SPLIT = re.compile(r"\s[·.]\s")


def short_title(title: str, max_uses: int = 2) -> str:
    """Krisha titles list every permitted use ("Свободное назначение, офисы, магазины и бутики,
    склады, общепит · 300 м²"). Keep the first few and the area; say how many were dropped.
    """
    if not title:
        return ""
    parts = _TITLE_SPLIT.split(title, maxsplit=1)
    head = parts[0]
    tail = parts[1].strip() if len(parts) > 1 else ""
    uses = [u.strip() for u in head.split(",") if u.strip()]
    if not uses:
        return title
    shown = ", ".join([uses[0], *[u.lower() if i else u for i, u in enumerate(uses[1:max_uses])]])
    extra = f" +{len(uses) - max_uses}" if len(uses) > max_uses else ""
    return f"{shown}{extra} · {tail}" if tail else f"{shown}{extra}"
