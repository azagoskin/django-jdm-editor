from __future__ import annotations

from django import forms
from django.db import models

from .validators import validate_jdm
from .widgets import JDMWidget


class JDMFormField(forms.JSONField):
    """Form field wiring :class:`~django_jdm_editor.widgets.JDMWidget` to a JSON value."""

    widget = JDMWidget

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("widget", JDMWidget)
        super().__init__(*args, **kwargs)


class JDMField(models.JSONField):
    """A ``JSONField`` that renders the JDM editor in forms / the admin by default.

    Drop-in usage::

        from django_jdm_editor.fields import JDMField

        class Policy(models.Model):
            decision = JDMField(default=dict, blank=True)

    You can also keep a plain ``JSONField`` and attach the widget manually via
    ``formfield_overrides`` on the ``ModelAdmin`` — see the README.
    """

    def __init__(self, *args, **kwargs):
        validators = list(kwargs.pop("validators", []))
        if validate_jdm not in validators:
            validators.append(validate_jdm)
        kwargs["validators"] = validators
        super().__init__(*args, **kwargs)

    def formfield(self, **kwargs):
        kwargs.setdefault("form_class", JDMFormField)
        return super().formfield(**kwargs)
