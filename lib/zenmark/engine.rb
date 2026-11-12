require_relative "../../app/helpers/zenmark/editor_helper"

module Zenmark
  class Engine < ::Rails::Engine
    isolate_namespace Zenmark

    if config.respond_to?(:assets)
      config.assets.paths << root.join("app/javascript")
    end

    initializer "zenmark.assets.precompile" do |app|
      if app.config.respond_to?(:assets)
        app.config.assets.precompile += %w( zenmark/editor.js )
      end
    end

    initializer "zenmark.helpers" do
      ActiveSupport.on_load(:action_controller_base) do
        helper Zenmark::EditorHelper
      end
    end

    initializer "zenmark.importmap", before: "importmap" do |app|
      if app.config.respond_to?(:importmap)
        app.config.importmap.paths << root.join("config/importmap.rb")
        app.config.importmap.cache_sweepers << root.join("app/javascript")
      end
    end

    initializer "zenmark.assets" do |app|
      if app.config.respond_to?(:assets)
        app.config.assets.paths << root.join("app/javascript")
        app.config.assets.precompile += %w[myengine/manifest.js]
      end
    end

    initializer "zenmark.tailwind" do |app|
      if app.config.respond_to?(:tailwind_content_paths)
        app.config.tailwind_content_paths ||= []
        app.config.tailwind_content_paths += [
          root.join("app/views/**/*.{erb,slim}").to_s,
          root.join("app/helpers/**/*.rb").to_s,
          root.join("app/javascript/**/*.js").to_s
        ]
      end
    end
  end
end
