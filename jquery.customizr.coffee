###
   * Cookie plugin
   *
   * Copyright (c) 2006 Klaus Hartl (stilbuero.de)
   * Dual licensed under the MIT and GPL licenses:
   * http://www.opensource.org/licenses/mit-license.php
   * http://www.gnu.org/licenses/gpl.html
###

jQuery.cookie = (key, value, options) ->
  if arguments.length > 1 and String(value) != "[object Object]"
    options = jQuery.extend({}, options)
    options.expires = -1  if value == null or value == undefined
    if typeof options.expires == "number"
      days = options.expires
      t = options.expires = new Date()
      t.setDate t.getDate() + days
    value = String(value)
    return (document.cookie = [
      encodeURIComponent(key), "=",
      (if options.raw then value else encodeURIComponent(value)),
      (if options.expires then "; expires=" + options.expires.toUTCString() else ""),
      (if options.path then "; path=" + options.path else ""),
      (if options.domain then "; domain=" + options.domain else ""),
      (if options.secure then "; secure" else "")
    ].join(""))
  options = value or {}
  if options.raw
    decode = (s)-> s
  else
    decode = decodeURIComponent
  (if (result = new RegExp("(?:^|; )" + encodeURIComponent(key) + "=([^;]*)").exec(document.cookie)) then decode(result[1]) else null)



#
####String Utilities
#

String::capitalizeFirstLetter = -> @charAt(0).toUpperCase() + @slice(1)
String::removeCurrencyDescriptor = -> @replace(/#\d+;/g, "").replace( /[^\d,.]/g, "" )


###
    @CookieStore

    * Write and Read from the cookie
--------------------------------------------------------------
###

class CookieStore

  _config =
    expires : 90
    path    : "/"
    domain  : window.location.hostname

  constructor: (@name = "shopify_product_customization")->
  
  write: (itemSpec)->
    $.cookie @name, JSON.stringify(itemSpec), _config

  read: ->
    _itemSpec = {}
    cookieData = $.cookie(@name)
    if cookieData?
      _itemSpec = JSON.parse(cookieData)
    _itemSpec
  
  destroy: ->
    $.cookie @name, null, _config


 ###
--------------------------------------------------------------
    @LocalStore
--------------------------------------------------------------
###
class LocalStore
  constructor: (@name)->
    # Grap the data from the cookie
    # (only if the user add something to cart already )
    tempCookieStore = new CookieStore()
    cookieData      = tempCookieStore.read()
    isEmpty = yes
    for i of cookieData
      isEmpty = no
    unless isEmpty
      @write(cookieData)
    tempCookieStore.destroy()

  write: (itemSpec)->
    localStorage.setItem(@name, JSON.stringify(itemSpec))

  read: ->
    _itemSpec = {}
    localData = localStorage.getItem(@name)
    
    if localData?
      _itemSpec = JSON.parse(localData)
    _itemSpec
    JSON.parse( localStorage.getItem(@name) )

  destroy: ->
    localStorage.removeItem(@name)


###
----------------------------------------------
    @Shopify.Cusomizr
----------------------------------------------
###

Shopify.Customizr = (($) ->

  config =
    lineItemFormatInTemplatesPlainText : "%qx %t for %p each"
    labelFormatOnCartPage              : "%s: "
    showLabelOnCartPage                : true
    useNativeValidation                : null
    attributeSeparator                 : " / "
    requiredCheckbox                   : "This checkbox is required"
    checkboxOnValue                    : "yes"
    requiredSelect                     : "Please select an option"
    requiredText                       : "This field is required"
    selector                           : null
    noLabel                            : "No label"
    renderAttributes                   : null
    
  
  # itemSpec will be loaded from cookie
  itemSpec     = {}
  isToCheckOut = false
  m            = false
  
  # Setting up cookie
  localStore = new LocalStore('shopify_product_customization')

  # Checking something... No idea...
  e = (q, s) ->

    if s == "required"

      ua = navigator.userAgent.toLowerCase()

      # If it includes chrome
      if ua.indexOf('chrome') isnt -1
        return true

      # If it includes safari
      if ua.indexOf("safari") isnt -1
        return false
    
    t = document.createElement(q)
    if s of t then true else false

  ###
  --------------------------------------------------------------
      @getLabel(inputFiele)
      * Returns label for input data
  --------------------------------------------------------------
  ###
  
  getLabel = ($field, formInstance) ->
    #Ex: t = <select name="design" data-label="Design"></select>
    # if t.attr('data-label') is set use that
    label = $field.attr("data-label")
    return label  if label
    
    # Try to create label from for attribute
    fieldId = $field.attr("id")
    if fieldId
      label = $.trim($("label[for=#{ fieldId }]", formInstance).filter(":first").text().replace(":", ""))
      return label  if label
    
    # Try to create label from name attribute
    fieldName = $field.attr("name")
    q = fieldName.match(/attributes\[([\w-]+)\]/)
    if q != null
      q[1].replace(/(-|_)/g, " ").capitalizeFirstLetter()
    else
      if fieldName
        fieldName.replace(/(-|_)/g, " ").capitalizeFirstLetter()
      else
        # If no label can be retrieved, return the No label as specified in `d`
        config.noLabel
 
  
  ###
  --------------------------------------------------------------
      validateField
      * Append required message on error
  --------------------------------------------------------------
  ###
  
  validateField = (field) ->
    
    # check if we can use native validation
    if config.useNativeValidation
      field.attr "required", "required"

    # if native validation is not available
    else
      # if its parent is not already ser error
      unless (field.parent().is(".error"))

        # try to get required Message text from data-error
        # q: requiredMessage
        requiredMessage = field.attr("data-error")

        unless requiredMessage
          if field.is(":checkbox")
            requiredMessage = config.requiredCheckbox
          else
            if field.is("select")
              requiredMessage = config.requiredSelect
            else
              requiredMessage = config.requiredText

        field.wrap "<span class=\"error\"></span>"
        field.after "<span>#{requiredMessage}</span>"
        
        # on field gets blurred, do validation
        field.blur ->
          value = field.val()
          # if value is filled out then remove error
          if value
            # Removes the message first
            field.parent().find("span").remove()
            # Then removes the .error
            field.unwrap()
            # lastly unbind this eventHandler
            $(this).unbind "blur"
  
  # Checking required field
  isRequired = (q) ->
    q.attr("required") or q.is(".required")

  # Returning the attributes in the specified format
  renderAttributes = (attributes, isForNote = false, isForCustomer = false) ->
    if config.renderAttributes
      s = config.renderAttributes(attributes, isForNote, isForCustomer)
    else
      s = ""
      if typeof attributes.length == "number"

        # Loop though elements
        for attr in attributes
          s += config.attributeSeparator
          # if it is set to show label on cart page
          # and the label is not No Label
          if config.showLabelOnCartPage and attr.label != config.noLabel
            s += config.labelFormatOnCartPage.replace("%s", attr.label)
          s += attr.value
      s
  
  ###
  --------------------------------------------------------------
      @updateQuantity
      change the quantity of the cookie and input val
  --------------------------------------------------------------
  ###
  
  updateQuantity = (variantId, uniqueId, updatedQty, $input) ->

    t = 0
    while t < itemSpec[variantId].length
      if itemSpec[variantId][t].uniqueId is uniqueId
        itemQty = itemSpec[variantId][t].quantity
        itemSpec[variantId][t].quantity = updatedQty
        changeInQty = updatedQty - itemQty
        currentQty  = parseInt($input.val(), 10)
        # Updates input value
        $input.val currentQty + changeInQty
        # if the item is removed,
        if updatedQty == 0
          # then remove from cookie
          itemSpec[variantId].splice( t, 1 )
          if itemSpec[variantId].length is 0
            itemSpec[variantId] = undefined
        # Then write to cookie
        localStore.write itemSpec
        break
      t++

  # variantId, uniqueId, itemPrice, priceContainer, isCurrencySet
  # Calculates the subtotal and formats it
  #o( variantId, uniqueId, variantPrice, $subTotal, u ) # variantId, uniqueId, itemPrice, subTotalPrice, isCurrencySet
  calcSubTotal = (variantId, uniqueId, variantPrice, $subTotal, s) ->
    
    t = 0
    while t < itemSpec[variantId].length
      if itemSpec[variantId][t].uniqueId == uniqueId
        subTotal = itemSpec[variantId][t].quantity * variantPrice
        format   = Shopify.money_format
        if s
          subTotal = Currency.convert(subTotal, Shopify.shop_currency, Currency.currentCurrency)
          format   = Currency.money_format[Currency.currentCurrency]
        $subTotal.html Shopify.formatMoney(subTotal, format)
        break
      t++
  
  # Checking currency
  checkCurrency = (shopCurrency) ->
    if (typeof Currency is "object") and (typeof Currency.convertAll is "function")
      Currency.currentCurrency and (Currency.currentCurrency isnt q)
    else
      false
  
  # Submit function to checkout
  a = ->
    $("form[action=\"/cart\"]").attr("action", "/checkout").get(0).submit()
  

  # Update Cart Info
  updateCartInfo = (cartInfo) ->

    data = ""
    customerData = 'attributes[customer]='

    $.each cartInfo, (variantId, w) ->
      
      if itemSpec[variantId] != undefined and itemSpec[variantId].length > 0
        template           = "\n#{ config.lineItemFormatInTemplatesPlainText }"
        variantTitle       = w.title
        variantQty         = w.quantity
        variantPrice       = w.price
        formattedPrice     = Shopify.formatMoney(variantPrice)
        noDescriptorPrice  = formattedPrice.removeCurrencyDescriptor()
        data += "attributes[#{ encodeURIComponent( variantTitle ) }]="

        $.each itemSpec[variantId], (C, item) ->

          itemQty = item.quantity
          
          # No idea why this is overriden...
          D = "<p>#{ renderAttributes(item.attributes, true) }</p>"
          D = "#{ variantTitle } #{ $(D).text() }"
          data += encodeURIComponent( template.replace("%q", itemQty).replace("%t", D).replace("%p", noDescriptorPrice) )
          
          D = "<p>#{ renderAttributes(item.attributes, true, true) }</p>"
          D = "#{ variantTitle } #{ $(D).text() }"
          customerData += encodeURIComponent( template.replace("%q", itemQty).replace("%t", D).replace("%p", noDescriptorPrice) )

          variantQty = variantQty - itemQty

        if variantQty > 0
          data += template.replace("%q", variantQty).replace("%t", variantTitle).replace("%p", noDescriptorPrice)

        data += "&"
      else
        data += "attributes[#{encodeURIComponent( variantTitle )}]=&"
    
    # Cart update setup
    updatePOST =
      type     : "POST"
      url      : "/cart/update.js"
      data     : data + customerData + "&"
      dataType : "json"
      success  : ->
        $("form[action=\"/cart\"]").attr("action", "/checkout").get(0).submit()

    # Update it.
    $.ajax updatePOST

  attach: (q) ->

    $.extend config, q or {}
    config.useNativeValidation = e("input", "required")  if config.useNativeValidation is null
    
    itemSpec = localStore.read()
    $.ajaxSetup
      cache: false

    $.getJSON "/cart.js", (_cartInfo) ->
      if _cartInfo.item_count is 0
        itemSpec = {}
        localStore.write(itemSpec)
    
    $ ->

      if config.useNativeValidation and $("script[src*=ajax]").not('[src*="googleapis"]').size()
        config.useNativeValidation = false

      $("form[action=\"/cart/add\"]").each ->
        $form           = $(this)
        formInstance    = $form[0]
        $submitButton   = $form.find("input:submit, input:image")
        onClickHandler  = $submitButton.attr("onclick")

        $submitButton.removeAttr "onclick"

        if typeof addToCart is 'function'
          $submitButton.unbind 'click', addToCart
        
        $submitButton.click ->
          variantId = $form.find("[name=id]").val()
          itemQty   = parseInt($form.find("[name=quantity]").val(), 10) or 1
          uniqueId  = (new Date()).getTime()
          isValid = true

          if variantId
            
            attributes = []

            # If selector is not set
            if config.selector == null
              
              $formFields = $form.find("input:enabled, select:enabled, textaea:enabled")
                .not("input:submit")
                .not("input:image")
                .not("input:file")
                .not("[name^=\"id\"]")
                .not("[name=\"quantity\"]")
                .not(".single-option-selector")
                .not(".ignore")

            else
              $formFields = $(config.selector)

            $formFields.each (F)->
            
              $field = $(this)
              value = ""

              # If it is checkbox
              if $field.is(":checkbox")
                # and it's checked
                if $field.is(":checked")
                  value = $(this).val()
                  if value is "on" or value is ""
                    value = config.checkboxOnValue
                else
                  # if it's not checked and it's required field
                  if isRequired($field)
                    isValid = false
                    validateField $field
                  return
              else
                # If it is radio button
                if $field.is(":radio")
                  # and if this is selected
                  if $field.is(":checked")
                    value = $field.val()
                    if value is ''
                      return
                  else
                    return
                else
                  # If it is some field
                  value = $field.val()
                  # and if no value is set...
                  if value is "" or value is undefined
                    # besides it's required...
                    if isRequired($field)
                      isValid = false
                      validateField $field
                    return
              
              label = getLabel($field, formInstance)

              attributes.push
                label: label
                value: value

            # If it's all valid
            if isValid
              # And if attributes is an array
              if attributes.length
                
                itemSpec[variantId] = itemSpec[variantId] or []
                isNewEntry = yes
                z = 0
                
                while z < itemSpec[variantId].length
                  if JSON.stringify(itemSpec[variantId][z].attributes) == JSON.stringify(attributes)
                    itemSpec[variantId][z].quantity += itemQty
                    isNewEntry = no
                    break
                  z++

                if isNewEntry
                  itemSpec[variantId].push
                    uniqueId    : uniqueId
                    quantity    : itemQty
                    attributes  : attributes

                localStore.write itemSpec

              if typeof onClickHandler is "function"
                s.call()
                false
              else
                if typeof addToCart is 'function'
                  addToCart.call($submitButton)
                  return false
                else
                  true
            else
              $("span.error :input:eq(0)").trigger "focus"
              if config.useNativeValidation
                true
              else
                false
  
  show: (_cartInfo, moneyFormat, shopCurrency = "USD", additionalConfig) ->
    
    $.extend config, additionalConfig or {}
    cartInfo = {}
    # If _cartInfo is jsondump
    if typeof _cartInfo.total_price is 'number'
      items = _cartInfo.items
      $.each items, (i, variant)->
        variantId                     = variant.id.toString()
        cartInfo[variantId]           = {}
        cartInfo[variantId].title     = variant.title
        cartInfo[variantId].price     = variant.price
        cartInfo[variantId].linePrice = variant.line_price
        cartInfo[variantId].quantity  = variant.quantity
    
    else
      cartInfo = _cartInfo

    Shopify.money_format  = moneyFormat or Shopify.money_format or "$ {{amount}}"
    Shopify.shop_currency = shopCurrency

    # if it is cart page
    if window.location.pathname is "/cart"
      # read the stored cookie 
      # i: itemSpecs
      itemSpec = localStore.read()
      
      # on page load
      $ ->
        
        $("input[name^=updates]").each ->
          $field = $(this)
          variantId = $field.attr("id").replace("updates_", "")
          $field.attr("name", "updates[#{ variantId }]")
        
        isCurrencySet = checkCurrency(Shopify.shop_currency)

        # For each cart items
        for variantId, items of itemSpec

          variantTitle          = cartInfo[variantId].title
          variantPrice          = cartInfo[variantId].price
          variantLinePrice      = cartInfo[variantId].linePrice
          removeLinkSelector    = "[href^=\"/cart/change/\"], [onclick]"
          inputSelector         = "#updates_" + variantId
          
          $input             = $(inputSelector)
          
          # It seems it only supports tr or li...
          $trWrapper         = $input.parents("tr")
          $liWrapper         = $input.parents("li")

          # if niether of tr / li wrapper exists, A.add(B) = [ $(A), $(B) ] sort of...
          if $trWrapper.add($liWrapper).length is 0
            # Delete this item
            itemSpec[variantId] = undefined
            # And Updates the cookie
            localStore.write itemSpec
            # Then go to next iteration
            continue
          
          $inputWrapper    = (if $trWrapper.length then $trWrapper else $liWrapper)
          $wrapperTagName  = (if $trWrapper.length then "tr" else "li")
          $variantQtyInput = $inputWrapper.find("input[name^=updates]").attr("name", "updates[#{variantId}]")
          variantQty       = parseInt($variantQtyInput.val(), 10)
          
          moneyFormat = Shopify.money_format

          # If there's currency settings
          if isCurrencySet
            variantLinePrice = Currency.convert(variantLinePrice, Shopify.shop_currency, Currency.currentCurrency)
            moneyFormat = Currency.money_format[Currency.currentCurrency]

          # Format number to price format, 4000 -> 40.00
          formattedPrice = Shopify.formatMoney(variantLinePrice, moneyFormat).removeCurrencyDescriptor()

          for item in items
            
            # Check if the item info is valid
            if (typeof item == "object") and ( typeof item.quantity is "number" ) and ( item.quantity > 0 )
              uniqueId           = item.uniqueId
              itemQty            = item.quantity
              $clonedWrapper     = $inputWrapper.clone(false).insertAfter($inputWrapper).hide()
              additionalAttrDOM  = renderAttributes(item.attributes, no)
              $qtyInput          = $clonedWrapper.find("input[name^=updates]")

              # Change the id to uniqueId, then remove the name, and change it's value
              # then, listen for the change event, with additional data
              $qtyInput.attr("id", uniqueId).removeAttr("name").val(itemQty).bind "change",
                variantId        : variantId
                uniqueId         : uniqueId
                originalQtyInput : $variantQtyInput
              , (e) ->
                
                ###
                  Keeps the rest of the handlers from being executed
                  and prevents the event from bubbling up the DOM tree.
                ###
                e.stopImmediatePropagation()
                variantId        = e.data.variantId
                uniqueId         = e.data.uniqueId
                originalQtyInput = e.data.originalQtyInput
                updatedQty       = parseInt($(this).val(), 10)

                #updateQuantity in cookie
                updateQuantity( variantId, uniqueId, updatedQty, originalQtyInput )
              
              ### 
                Remove the inline script, then bind custom click event,
                This handles removing the items from cart [Remove from cart] link
              ###
              $clonedWrapper.find(removeLinkSelector).removeAttr("onclick").unbind("click").bind "click",
                qtyInput        : $qtyInput
                variantId       : variantId
                uniqueId        : uniqueId
                originalQtyInput: $variantQtyInput
              , (e) ->

                e.stopImmediatePropagation()
                e.preventDefault()
                
                variantId        = e.data.variantId
                uniqueId         = e.data.uniqueId
                qtyInput         = e.data.qtyInput
                originalQtyInput = e.data.originalQtyInput

                # Update quantity in cookie, basically remove it
                updateQuantity( variantId, uniqueId, 0, originalQtyInput )
                qtyInput.val 0
                $("form[action=\"/cart\"]").get(0).submit()
              
              variantQty -= itemQty

              # renders the additional attributes
              unless config.appendTo
                $clonedWrapper.find(":contains(#{ variantTitle }):last").get(0).innerHTML += additionalAttrDOM
              else
                $clonedWrapper.find(config.appendTo).append( additionalAttrDOM )
                
              $subTotal = $clonedWrapper.find(":contains(#{ formattedPrice }):last")

              # Calculates the subtotoal and format it
              calcSubTotal( variantId, uniqueId, variantPrice, $subTotal, isCurrencySet ) # variantId, uniqueId, itemPrice, subTotalPrice, isCurrencySet

              $clonedWrapper.show()
          
          # If there is no custom item at all.
          if variantQty > 0

            $noCustomInput = $variantQtyInput.hide().clone(false)
              .insertAfter($variantQtyInput).val(variantQty).removeAttr("name").attr("data-before", variantQty)
              .unbind("change").show().bind "change", originalQtyInput: $variantQtyInput
            , (e) ->

              $el = $(this)
              e.stopImmediatePropagation()
              variantQtyBefore   = parseInt($el.attr("data-before"), 10)
              variantQtyCurrent  = parseInt($el.val(), 10)
              $originalQtyInput  = e.data.originalQtyInput
              variantQtyChange   = variantQtyCurrent - variantQtyBefore
              originalQty        = parseInt($originalQtyInput.val(), 10)
              $el.attr "data-before", variantQtyCurrent
              $originalQtyInput.val( originalQty + variantQtyChange )
            
            $inputWrapper.find(removeLinkSelector).removeAttr("onclick").unbind("click").bind "click",
              noCustomInput    : $noCustomInput
              originalQtyInput : $variantQtyInput
            , (e) ->

              e.stopImmediatePropagation()
              e.preventDefault()
              $noCustomInput   = e.data.noCustomInput
              $variantQtyInput = e.data.originalQtyInput
              noCustomQty      = parseInt($noCustomInput.val(), 10)

              # hmm naming...
              variantQty       = parseInt($variantQtyInput.val(), 10)
              $originalQtyInput.val(variantQty - noCustomInput)
              $noCustomInput.val 0
              $("form[action=\"/cart\"]").get(0).submit()
            

            $subTotal      = $inputWrapper.find(":contains(#{ formattedPrice }):last")

            subTotalNumber =  variantQty * variantPrice
            moneyFormat    = Shopify.money_format

            if isCurrencySet
              subTotalNumber = Currency.convert(subTotalNumber, Shopify.shop_currency, Currency.currentCurrency)
              moneyFormat = Currency.money_format[Currency.currentCurrency]

            $subTotal.html Shopify.formatMoney(subTotalNumber, moneyFormat)

          else
            $inputWrapper.hide()

        # No idea....
        $("form[action=\"/cart\"] li:has(:text):odd").addClass("even").removeClass "odd"
        $("form[action=\"/cart\"] li:has(:text):even").addClass("odd").removeClass "even"
        $("form[action=\"/cart\"] tr:has(:text):odd").addClass("even").removeClass "odd"
        $("form[action=\"/cart\"] tr:has(:text):even").addClass("odd").removeClass "even"
        
        $("input[name=\"checkout\"], input[name=\"goto_pp\"], input[name=\"goto_gc\"]").click ->
          isToCheckOut = true
        
        $("form[action=\"/cart\"]").submit (e) ->
          return false  if m
          if isToCheckOut
            e.preventDefault()
            m = true
            updateCartInfo( cartInfo )
          else
            true


  getConfig: ->

    config
  

  clearAttributes: ->

    localStore.destroy()
    itemSpec = {}
  

  ###
  --------------------------------------------------------------
      @Inspector
  --------------------------------------------------------------
  ###
  
  inspectAttributes: (u, s, q) ->

    t = (if typeof q == "string" then q else "  ")
    r = JSON.stringify(localStore.read(), null, t)
    w = document.getElementById(u or "attributes-wrapper")
    if typeof w == "object"
      w.innerHTML = r
      w.style.display = "block"
    v = document.getElementById(s or "hide-attributes")
    v.style.display = "inline"  if typeof v == "object"
    r

)(jQuery)

