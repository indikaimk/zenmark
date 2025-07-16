Zenmark::Engine.routes.draw do
  resources :images, only: [:create]
  resources :previews, only: [:create]
end
