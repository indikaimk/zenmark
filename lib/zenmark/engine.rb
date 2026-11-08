require_relative "../../app/helpers/zenmark/editor_helper"

module Zenmark
  class Engine < ::Rails::Engine
    isolate_namespace Zenmark

    config.assets.paths << root.join("app/javascript")

    initializer "zenmark.assets.precompile" do |app|
      app.config.assets.precompile += %w( zenmark/editor.js )
    end

    initializer "zenmark.helpers" do
      ActiveSupport.on_load(:action_controller_base) do
        helper Zenmark::EditorHelper
      end
    end

    initializer "zenmark.importmap", before: "importmap" do |app|
      app.config.importmap.paths << root.join("config/importmap.rb")
      app.config.importmap.cache_sweepers << root.join("app/javascript")
    end

    initializer "zenmark.assets" do |app|
      app.config.assets.paths << root.join("app/javascript")
      app.config.assets.precompile += %w[myengine/manifest.js]
    end
  end
end
