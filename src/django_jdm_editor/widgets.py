from __future__ import annotations

import json

from django import forms
from django.utils.safestring import mark_safe


class JDMWidget(forms.Widget):
    """A Django form widget that mounts the GoRules ``@gorules/jdm-editor``.

    The widget renders a hidden ``<input>`` holding the serialized JDM JSON plus a
    ``<div data-jdm-editor>`` container that the bundled JS mounts a
    ``DecisionGraph`` onto. On change the JS writes the updated JSON back into the
    hidden input, so the value travels with the form like any other field — Python
    never touches React.
    """

    template_name = "django_jdm_editor/widget.html"

    class Media:
        js = ["django_jdm_editor/jdm-editor.js"]
        css = {"all": ["django_jdm_editor/jdm-editor.css"]}

    def format_value(self, value):
        if value is None or value == "":
            return ""
        if isinstance(value, str):
            # Already a JSON string (e.g. coming back from a submitted form).
            return value
        return json.dumps(value, ensure_ascii=False)

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        widget = context["widget"]
        attrs = widget["attrs"]
        widget_id = attrs.get("id") or f"id_{name}"
        attrs["id"] = widget_id
        widget["input_id"] = f"{widget_id}_input"
        widget["disabled"] = bool(attrs.get("disabled", False))
        return context

    def render(self, name, value, attrs=None, renderer=None):
        return mark_safe(super().render(name, value, attrs=attrs, renderer=renderer))
