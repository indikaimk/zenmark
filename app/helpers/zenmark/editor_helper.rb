module Zenmark
  module EditorHelper
    def zenmark_editor(form, field, image_upload_url)
      content_tag :div, class: "zenmark-editor", data: { controller: 'zenmark-editor', "zenmark-editor-image-upload-url-value": image_upload_url } do
        render("zenmark/toolbar") +
        render("zenmark/link_dialog") +
        render("zenmark/image_dialog") +
        # file_field_tag(:file, style: "display: none;", data: { "zenmark-editor-target" => "fileInput", action: "change->zenmark-editor#uploadImage" }) +
        form.file_field(:content_images, multiple: true, style: "display: none;", data: {"zenmark-editor-target" => "fileInput", action: "change->zenmark-editor#uploadImage" }) +
        form.submit("Upload Image", style: "display: none;", data: { "zenmark-editor-target" => "uploadImage" }) +

        form.text_area(field, data: {"zenmark-editor-target": "mdtextarea",  action: "keydown.space->zenmark-editor#countWords"}, class: "zenmark-textarea") +
        content_tag(:div, "", class: "status-bar", data: { "zenmark-editor-target" => "wordCount" }) +

        content_tag(:div, "", id: "zenmark-preview", data: { "zenmark-editor-target" => "previewArea" })
      end
    end
  end
end
