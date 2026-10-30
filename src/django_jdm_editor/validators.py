from __future__ import annotations

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

#: An empty-but-valid JDM decision graph.
EMPTY_JDM_GRAPH = {"nodes": [], "edges": []}


def validate_jdm(value) -> None:
    """Lightweight structural validation of a JDM decision graph.

    This intentionally does *not* reproduce the full ``zen-engine`` validation —
    it only checks the top-level shape (a mapping with ``nodes`` and ``edges``
    lists) so obviously broken data is rejected early. Deep validation is left to
    the engine (see the optional ``simulation`` extra).
    """
    if value in (None, "", EMPTY_JDM_GRAPH):
        return

    if not isinstance(value, dict):
        raise ValidationError(
            _("A JDM graph must be a JSON object, got %(type)s."),
            code="invalid",
            params={"type": type(value).__name__},
        )

    for key in ("nodes", "edges"):
        if key not in value:
            raise ValidationError(
                _("A JDM graph must contain a %(key)s key."),
                code="invalid",
                params={"key": key},
            )
        if not isinstance(value[key], list):
            raise ValidationError(
                _("The %(key)s of a JDM graph must be a list."),
                code="invalid",
                params={"key": key},
            )
