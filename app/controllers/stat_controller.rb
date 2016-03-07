require 'json'

class StatController < ApplicationController
  before_action :init

  def init
    @datafile = 'langs_stat.json'
  end

  def index
    @langs_stat = JSON.load(File.read(@datafile))

    respond_to do |format|
      format.html
      format.json { render json: @langs_stat }
    end
  end

  def update
    file_is_not_exist = !File.exist?(@datafile)
    file_is_too_old   = (File.mtime(@datafile) + (60 * 60 * 24) <=> Time.now) == -1

    result =
      if file_is_not_exist or file_is_too_old
        `rake update_langs_stat`
      else
        'skipped updating.'
      end

    render text: result
  end
end
