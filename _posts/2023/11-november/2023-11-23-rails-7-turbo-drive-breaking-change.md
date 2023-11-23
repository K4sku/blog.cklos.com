---
title: "Rails 7 Turbo Drive breaking change"
categories: ["rails", "rails 7", "turbo drive", "breaking change"]
---

You might encounter it when upgrading to rails >= 7.

>There is a breaking change in Rails 7: Invalid form submissions have to return a 422 status code for Turbo Drive to replace the <body> of the page and display the form errors. The alias for the 422 status code in Rails is :unprocessable_entity. That’s why, since Ruby on Rails 7, the scaffold generator adds status: :unprocessable_entity to #create and #update actions when the resource couldn’t be saved due to an invalid form submission.

It is all about status in `else`
```ruby
def create
  @quote = Quote.new(quote_params)
  
  if @quote.save
    redirect_to quotes_path, notice: "Quote was successfully created."
  else
    render :new, status: :unprocessable_entity
  end
end
```

No validation error messages and console error without `status: :unprocessable_entity`
![](/assets/images/2023-11-23/broken_behavior.png)

Expected behavior with `status: :unprocessable_entity`
![](/assets/images/2023-11-23/expected_behavior.png)

Source: [Turbo Rails Tutorial](https://www.hotrails.dev/turbo-rails/turbo-drive)