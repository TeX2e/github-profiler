require 'json'

class StatController < ApplicationController
  def index
    datafile = 'langs_stat.json'
    @langs_stat = JSON.load(File.read(datafile))

    respond_to do |format|
      format.html
      format.json { render json: @langs_stat }
    end
  end
end
