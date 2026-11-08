require "zenmark/version"
require "zenmark/engine"

module Zenmark
  mattr_accessor :markdown_renderer

  def self.configure
    yield self if block_given?
  end
end
