from django_jdm_editor.widgets import JDMWidget


def test_render_contains_container_and_hidden_input():
    widget = JDMWidget()
    html = widget.render("decision", '{"nodes": [], "edges": []}', attrs={"id": "id_decision"})

    assert "data-jdm-editor" in html
    assert 'type="hidden"' in html
    assert 'name="decision"' in html
    assert 'id="id_decision_input"' in html
    assert 'data-input-id="id_decision_input"' in html


def test_render_escapes_and_serializes_dict_value():
    widget = JDMWidget()
    html = widget.render("decision", {"nodes": [], "edges": []}, attrs={"id": "id_decision"})
    # dict values get JSON-serialized into the hidden input value
    assert "nodes" in html and "edges" in html


def test_media_includes_both_assets():
    widget = JDMWidget()
    media = str(widget.media)
    assert "django_jdm_editor/jdm-editor.js" in media
    assert "django_jdm_editor/jdm-editor.css" in media


def test_disabled_flag_propagates():
    widget = JDMWidget()
    html = widget.render("decision", "", attrs={"id": "id_decision", "disabled": True})
    assert 'data-disabled="true"' in html
