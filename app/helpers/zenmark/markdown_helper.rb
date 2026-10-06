module Zenmark
  module MarkdownHelper
    def render_markdown(text)
      return "" if text.blank?

      renderer = Redcarpet::Render::HTML.new(
        hard_wrap: true,
        filter_html: false,
        safe_links_only: true
      )
      markdown = Redcarpet::Markdown.new(
        renderer,
        fenced_code_blocks: true,
        autolink: true,
        tables: true,
        strikethrough: true,
        space_after_headers: true,
        superscript: true,
        underline: true,
        highlight: true,
        footnotes: true,
        no_intra_emphasis: true
      )
      markdown.render(text.to_s).html_safe
    end
  end
end
