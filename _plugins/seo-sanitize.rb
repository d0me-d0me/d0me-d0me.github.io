# frozen_string_literal: true

Jekyll::Hooks.register [:pages, :documents], :post_render do |item|
  next unless item.output

  item.output.gsub!(%r{<meta name="generator"[^>]*/?>[\n\r]*}, "")

  if item.respond_to?(:url) && item.url =~ %r{^/(index\.html)?$}
    item.output.gsub!(%r{<title>\s*\|\s*}, "<title>")
  end
end
