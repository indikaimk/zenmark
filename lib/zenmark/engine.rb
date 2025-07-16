module Zenmark
  class Engine < ::Rails::Engine
    isolate_namespace Zenmark

    initializer "zenmark.assets.precompile" do |app|
      app.config.assets.precompile += %w( zenmark/editor.js )
    end

    initializer "zenmark.helpers" do
      ActiveSupport.on_load(:action_controller_base) do
        helper Zenmark::EditorHelper
      end
    end


     # `before:` option has to be a string as it has to match
    # a named initializer exaclty as a String or a Symbol
    # "importmap" is a string, you can see this list to check
    # the order of initializers:
    #   Rails.application.initializers.tsort.map(&:name)
    initializer "zenmark.importmap", before: "importmap" do |app|
      # https://github.com/rails/importmap-rails#composing-import-maps
      app.config.importmap.paths << root.join("config/importmap.rb")

      # https://github.com/rails/importmap-rails#sweeping-the-cache-in-development-and-test
      app.config.importmap.cache_sweepers << root.join("app/javascript")
    end

    initializer "zenmark.assets" do |app|
      # my_engine/app/javascript needs to be in the asset path
      app.config.assets.paths << root.join("app/javascript")

      # manifest has to be precompiled
      app.config.assets.precompile += %w[myengine/manifest.js]
    end
  end
end
