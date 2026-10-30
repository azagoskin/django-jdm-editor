import pytest
from django.core.exceptions import ValidationError

from django_jdm_editor.fields import JDMField, JDMFormField
from django_jdm_editor.validators import validate_jdm
from django_jdm_editor.widgets import JDMWidget


def test_modelfield_formfield_uses_jdm_widget():
    field = JDMField()
    form_field = field.formfield()
    assert isinstance(form_field, JDMFormField)
    assert isinstance(form_field.widget, JDMWidget)


def test_modelfield_attaches_validator():
    field = JDMField()
    assert validate_jdm in field.validators


def test_formfield_json_roundtrip():
    form_field = JDMFormField(required=False)
    value = {"nodes": [{"id": "1"}], "edges": []}
    serialized = form_field.widget.format_value(value)
    cleaned = form_field.clean(serialized)
    assert cleaned == value


def test_validate_jdm_accepts_valid_graph():
    validate_jdm({"nodes": [], "edges": []})
    validate_jdm({"nodes": [{"id": "a"}], "edges": [{"id": "e"}]})


def test_validate_jdm_accepts_empty():
    validate_jdm(None)
    validate_jdm("")


@pytest.mark.parametrize(
    "bad",
    [
        [],
        {"nodes": []},
        {"edges": []},
        {"nodes": {}, "edges": []},
        {"nodes": [], "edges": "x"},
        "not-a-dict",
    ],
)
def test_validate_jdm_rejects_broken_structure(bad):
    with pytest.raises(ValidationError):
        validate_jdm(bad)
