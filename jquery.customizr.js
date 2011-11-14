(function() {
  /*
  --------------------------------------------------------------
     * Cookie plugin
     *
     * Copyright (c) 2006 Klaus Hartl (stilbuero.de)
     * Dual licensed under the MIT and GPL licenses:
     * http://www.opensource.org/licenses/mit-license.php
     * http://www.gnu.org/licenses/gpl.html
  --------------------------------------------------------------
  */
  var CookieStore;
  jQuery.cookie = function(key, value, options) {
    var days, decode, result, t;
    if (arguments.length > 1 && String(value) !== "[object Object]") {
      options = jQuery.extend({}, options);
      if (value === null || value === void 0) {
        options.expires = -1;
      }
      if (typeof options.expires === "number") {
        days = options.expires;
        t = options.expires = new Date();
        t.setDate(t.getDate() + days);
      }
      value = String(value);
      return document.cookie = [encodeURIComponent(key), "=", (options.raw ? value : encodeURIComponent(value)), (options.expires ? "; expires=" + options.expires.toUTCString() : ""), (options.path ? "; path=" + options.path : ""), (options.domain ? "; domain=" + options.domain : ""), (options.secure ? "; secure" : "")].join("");
    }
    options = value || {};
    if (options.raw) {
      decode = function(s) {
        return s;
      };
    } else {
      decode = decodeURIComponent;
    }
    if ((result = new RegExp("(?:^|; )" + encodeURIComponent(key) + "=([^;]*)").exec(document.cookie))) {
      return decode(result[1]);
    } else {
      return null;
    }
  };
  /*
  ----------------------------------------------
      @String Utilities
  ----------------------------------------------
  */
  String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };
  String.prototype.removeCurrencyDescriptor = function() {
    return this.replace(/#\d+;/g, "").replace(/[^\d,.]/g, "");
  };
  /*
  --------------------------------------------------------------
      @CookieStore
  
      * Write and Read from the cookie
  --------------------------------------------------------------
  */
  CookieStore = (function() {
    var _config;
    _config = {
      expires: 90,
      path: "/",
      domain: window.location.hostname
    };
    function CookieStore(name) {
      this.name = name != null ? name : "shopify_product_customization";
    }
    CookieStore.prototype.write = function(itemSpec) {
      return $.cookie(this.name, JSON.stringify(itemSpec), _config);
    };
    CookieStore.prototype.read = function() {
      var cookieData, _itemSpec;
      _itemSpec = {};
      cookieData = $.cookie(this.name);
      if (cookieData != null) {
        _itemSpec = JSON.parse(cookieData);
      }
      return _itemSpec;
    };
    CookieStore.prototype.destroy = function() {
      return $.cookie(this.name, null, _config);
    };
    return CookieStore;
  })();
  /*
  ----------------------------------------------
      @Shopify.Cusomizr
  ----------------------------------------------
  */
  Shopify.Customizr = (function($) {
    var a, calcSubTotal, checkCurrency, config, cookieStore, e, getLabel, isRequired, isToCheckOut, itemSpec, m, renderAttributes, updateCartInfo, updateQuantity, validateField;
    config = {
      lineItemFormatInTemplatesPlainText: "%qx %t for %p each",
      labelFormatOnCartPage: "%s: ",
      showLabelOnCartPage: true,
      useNativeValidation: null,
      attributeSeparator: " / ",
      requiredCheckbox: "This checkbox is required",
      checkboxOnValue: "yes",
      requiredSelect: "Please select an option",
      requiredText: "This field is required",
      selector: null,
      noLabel: "No label",
      renderAttributes: null
    };
    itemSpec = {};
    isToCheckOut = false;
    m = false;
    cookieStore = new CookieStore();
    e = function(q, s) {
      var t, ua;
      if (s === "required") {
        ua = navigator.userAgent.toLowerCase();
        if (ua.indexOf('chrome') !== -1) {
          return true;
        }
        if (ua.indexOf("safari") !== -1) {
          return false;
        }
      }
      t = document.createElement(q);
      if (s in t) {
        return true;
      } else {
        return false;
      }
    };
    /*
      --------------------------------------------------------------
          @getLabel(inputFiele)
          * Returns label for input data
      --------------------------------------------------------------
      */
    getLabel = function($field) {
      var fieldId, fieldName, label, q;
      label = $field.attr("data-label");
      if (label) {
        return label;
      }
      fieldId = $field.attr("id");
      if (fieldId) {
        label = $.trim($("label[for=" + fieldId + "]").text().replace(":", ""));
        if (label) {
          return label;
        }
      }
      fieldName = $field.attr("name");
      q = fieldName.match(/attributes\[([\w-]+)\]/);
      if (q !== null) {
        return q[1].replace(/(-|_)/g, " ").capitalizeFirstLetter();
      } else {
        if (fieldName) {
          return fieldName.replace(/(-|_)/g, " ").capitalizeFirstLetter();
        } else {
          return config.noLabel;
        }
      }
    };
    /*
      --------------------------------------------------------------
          validateField
          * Append required message on error
      --------------------------------------------------------------
      */
    validateField = function(field) {
      var requiredMessage;
      if (config.useNativeValidation) {
        return field.attr("required", "required");
      } else {
        if (!(field.parent().is(".error"))) {
          requiredMessage = field.attr("data-error");
          if (!requiredMessage) {
            if (field.is(":checkbox")) {
              requiredMessage = config.requiredCheckbox;
            } else {
              if (field.is("select")) {
                requiredMessage = config.requiredSelect;
              } else {
                requiredMessage = config.requiredText;
              }
            }
          }
          field.wrap("<span class=\"error\"></span>");
          field.after("<span>" + requiredMessage + "</span>");
          return field.blur(function() {
            var value;
            value = field.val();
            if (value) {
              field.parent().find("span").remove();
              field.unwrap();
              return $(this).unbind("blur");
            }
          });
        }
      }
    };
    isRequired = function(q) {
      return q.attr("required") || q.is(".required");
    };
    renderAttributes = function(attributes, isForNote) {
      var attr, s, _i, _len;
      if (isForNote == null) {
        isForNote = false;
      }
      if (config.renderAttributes) {
        return s = config.renderAttributes(attributes, isForNote);
      } else {
        s = "";
        if (typeof attributes.length === "number") {
          for (_i = 0, _len = attributes.length; _i < _len; _i++) {
            attr = attributes[_i];
            s += config.attributeSeparator;
            if (config.showLabelOnCartPage && attr.label !== config.noLabel) {
              s += config.labelFormatOnCartPage.replace("%s", attr.label);
            }
            s += attr.value;
          }
        }
        return s;
      }
    };
    /*
      --------------------------------------------------------------
          @updateQuantity
          change the quantity of the cookie and input val
      --------------------------------------------------------------
      */
    updateQuantity = function(variantId, uniqueId, updatedQty, $input) {
      var changeInQty, currentQty, itemQty, t, _results;
      t = 0;
      _results = [];
      while (t < itemSpec[variantId].length) {
        if (itemSpec[variantId][t].uniqueId === uniqueId) {
          itemQty = itemSpec[variantId][t].quantity;
          itemSpec[variantId][t].quantity = updatedQty;
          changeInQty = updatedQty - itemQty;
          currentQty = parseInt($input.val(), 10);
          $input.val(currentQty + changeInQty);
          if (updatedQty === 0) {
            itemSpec[variantId].splice(t, 1);
            if (itemSpec[variantId].length === 0) {
              itemSpec[variantId] = void 0;
            }
          }
          cookieStore.write(itemSpec);
          break;
        }
        _results.push(t++);
      }
      return _results;
    };
    calcSubTotal = function(variantId, uniqueId, variantPrice, $subTotal, s) {
      var format, subTotal, t, _results;
      t = 0;
      _results = [];
      while (t < itemSpec[variantId].length) {
        if (itemSpec[variantId][t].uniqueId === uniqueId) {
          subTotal = itemSpec[variantId][t].quantity * variantPrice;
          format = Shopify.money_format;
          if (s) {
            subTotal = Currency.convert(subTotal, Shopify.shop_currency, Currency.currentCurrency);
            format = Currency.money_format[Currency.currentCurrency];
          }
          $subTotal.html(Shopify.formatMoney(subTotal, format));
          break;
        }
        _results.push(t++);
      }
      return _results;
    };
    checkCurrency = function(shopCurrency) {
      if ((typeof Currency === "object") && (typeof Currency.convertAll === "function")) {
        return Currency.currentCurrency && (Currency.currentCurrency !== q);
      } else {
        return false;
      }
    };
    a = function() {
      return $("form[action=\"/cart\"]").attr("action", "/checkout").get(0).submit();
    };
    updateCartInfo = function(cartInfo) {
      var data, updatePOST;
      data = "";
      $.each(cartInfo, function(variantId, w) {
        var formattedPrice, noDescriptorPrice, template, variantPrice, variantQty, variantTitle;
        if (itemSpec[variantId] !== void 0 && itemSpec[variantId].length > 0) {
          template = "\n" + config.lineItemFormatInTemplatesPlainText;
          variantTitle = w.title;
          variantQty = w.quantity;
          variantPrice = w.price;
          formattedPrice = Shopify.formatMoney(variantPrice);
          noDescriptorPrice = formattedPrice.removeCurrencyDescriptor();
          data += "attributes[" + variantTitle + "]=";
          $.each(itemSpec[variantId], function(C, item) {
            var D, itemQty;
            itemQty = item.quantity;
            D = "<p>" + (renderAttributes(item.attributes, true)) + "</p>";
            D = "" + variantTitle + " " + ($(D).text());
            data += template.replace("%q", itemQty).replace("%t", D).replace("%p", noDescriptorPrice);
            return variantQty = variantQty - itemQty;
          });
          if (variantQty > 0) {
            data += template.replace("%q", variantQty).replace("%t", variantTitle).replace("%p", noDescriptorPrice);
          }
          return data += "&";
        } else {
          return data += "attributes[" + variantTitle + "]=&";
        }
      });
      updatePOST = {
        type: "POST",
        url: "/cart/update.js",
        data: data,
        dataType: "json",
        success: function() {
          console.log(arguments);
          return $("form[action=\"/cart\"]").attr("action", "/checkout").get(0).submit();
        }
      };
      return $.ajax(updatePOST);
    };
    return {
      attach: function(q) {
        $.extend(config, q || {});
        if (config.useNativeValidation === null) {
          config.useNativeValidation = e("input", "required");
        }
        if (window.location.pathname.indexOf("/products/") !== -1) {
          itemSpec = cookieStore.read();
          $.ajaxSetup({
            cache: false
          });
          $.getJSON("/cart.js", function(_cartInfo) {
            if (_cartInfo.item_count === 0) {
              itemSpec = {};
              return cookieStore.destroy();
            }
          });
          return $(function() {
            var $addToCartForm, $submitButton, onClickHandler;
            if (config.useNativeValidation && $("script[src*=ajax]").length) {
              config.useNativeValidation = false;
            }
            $addToCartForm = $("form[action=\"/cart/add\"]");
            $submitButton = $addToCartForm.find("input:submit, input:image");
            onClickHandler = $submitButton.attr("onclick");
            $submitButton.removeAttr("onclick");
            return $submitButton.click(function(u) {
              var $formFields, attributes, isNewEntry, isValid, itemQty, uniqueId, variantId, z;
              variantId = $addToCartForm.find("[name=id]").val();
              itemQty = parseInt($addToCartForm.find("[name=quantity]").val(), 10) || 1;
              uniqueId = (new Date()).getTime();
              isValid = true;
              if (variantId) {
                attributes = [];
                if (config.selector === null) {
                  $formFields = $addToCartForm.find("input:enabled, select:enabled").not("input:submit").not("input:image").not("input:file").not("[name^=\"id\"]").not("[name=\"quantity\"]").not(".single-option-selector").not(".ignore");
                } else {
                  $formFields = $(config.selector);
                }
                $formFields.each(function() {
                  var $field, label, value;
                  $field = $(this);
                  value = "";
                  if ($field.is(":checkbox")) {
                    if ($field.is(":checked")) {
                      value = $(this).val();
                      if (value === "on" || value === "") {
                        value = config.checkboxOnValue;
                      }
                    } else {
                      if (isRequired($field)) {
                        isValid = false;
                        validateField($field);
                      }
                      return;
                    }
                  } else {
                    if ($field.is(":radio")) {
                      if ($field.is(":checked")) {
                        value = $field.val();
                        if (value === '') {
                          return;
                        }
                      } else {
                        return;
                      }
                    } else {
                      value = $field.val();
                      if (value === "" || value === void 0) {
                        if (isRequired($field)) {
                          isValid = false;
                          validateField($field);
                        }
                        return;
                      }
                    }
                  }
                  label = getLabel($field);
                  return attributes.push({
                    label: label,
                    value: value
                  });
                });
                if (isValid) {
                  if (attributes.length) {
                    itemSpec[variantId] = itemSpec[variantId] || [];
                    isNewEntry = true;
                    z = 0;
                    while (z < itemSpec[variantId].length) {
                      if (JSON.stringify(itemSpec[variantId][z].attributes) === JSON.stringify(attributes)) {
                        itemSpec[variantId][z].quantity += itemQty;
                        isNewEntry = false;
                        break;
                      }
                      z++;
                    }
                    if (isNewEntry) {
                      itemSpec[variantId].push({
                        uniqueId: uniqueId,
                        quantity: itemQty,
                        attributes: attributes
                      });
                    }
                    cookieStore.write(itemSpec);
                  }
                  if (typeof onClickHandler === "function") {
                    onClickHandler.call();
                    return false;
                  } else {
                    return true;
                  }
                } else {
                  $("span.error :input:eq(0)").trigger("focus");
                  if (config.useNativeValidation) {
                    return true;
                  } else {
                    return false;
                  }
                }
              }
            });
          });
        }
      },
      show: function(_cartInfo, moneyFormat, shopCurrency, additionalConfig) {
        var cartInfo, items;
        if (shopCurrency == null) {
          shopCurrency = "USD";
        }
        $.extend(config, additionalConfig || {});
        cartInfo = {};
        if (typeof _cartInfo.total_price === 'number') {
          items = _cartInfo.items;
          $.each(items, function(i, variant) {
            var variantId;
            variantId = variant.id.toString();
            cartInfo[variantId] = {};
            cartInfo[variantId].title = variant.title;
            cartInfo[variantId].price = variant.price;
            cartInfo[variantId].linePrice = variant.line_price;
            return cartInfo[variantId].quantity = variant.quantity;
          });
        } else {
          cartInfo = _cartInfo;
        }
        Shopify.money_format = moneyFormat || Shopify.money_format || "$ {{amount}}";
        Shopify.shop_currency = shopCurrency;
        if (window.location.pathname === "/cart") {
          itemSpec = cookieStore.read();
          return $(function() {
            var $clonedWrapper, $input, $inputWrapper, $liWrapper, $noCustomInput, $qtyInput, $subTotal, $trWrapper, $variantQtyInput, $wrapperTagName, additionalAttrDOM, formattedPrice, inputSelector, isCurrencySet, item, itemQty, items, removeLinkSelector, subTotalNumber, uniqueId, variantId, variantLinePrice, variantPrice, variantQty, variantTitle, _i, _len;
            $("input[name^=updates]").each(function() {
              var $field, variantId;
              $field = $(this);
              variantId = $field.attr("id").replace("updates_", "");
              return $field.attr("name", "updates[" + variantId + "]");
            });
            isCurrencySet = checkCurrency(Shopify.shop_currency);
            for (variantId in itemSpec) {
              items = itemSpec[variantId];
              variantTitle = cartInfo[variantId].title;
              variantPrice = cartInfo[variantId].price;
              variantLinePrice = cartInfo[variantId].linePrice;
              removeLinkSelector = "[href^=\"/cart/change/\"], [onclick]";
              inputSelector = "#updates_" + variantId;
              $input = $(inputSelector);
              $trWrapper = $input.parents("tr");
              $liWrapper = $input.parents("li");
              if ($trWrapper.add($liWrapper).length === 0) {
                itemSpec[variantId] = void 0;
                cookieStore.write(itemSpec);
                continue;
              }
              $inputWrapper = ($trWrapper.length ? $trWrapper : $liWrapper);
              $wrapperTagName = ($trWrapper.length ? "tr" : "li");
              $variantQtyInput = $inputWrapper.find("input[name^=updates]").attr("name", "updates[" + variantId + "]");
              variantQty = parseInt($variantQtyInput.val(), 10);
              moneyFormat = Shopify.money_format;
              if (isCurrencySet) {
                variantLinePrice = Currency.convert(variantLinePrice, Shopify.shop_currency, Currency.currentCurrency);
                moneyFormat = Currency.money_format[Currency.currentCurrency];
              }
              formattedPrice = Shopify.formatMoney(variantLinePrice, moneyFormat).removeCurrencyDescriptor();
              for (_i = 0, _len = items.length; _i < _len; _i++) {
                item = items[_i];
                if ((typeof item === "object") && (typeof item.quantity === "number") && (item.quantity > 0)) {
                  uniqueId = item.uniqueId;
                  itemQty = item.quantity;
                  $clonedWrapper = $inputWrapper.clone(false).insertAfter($inputWrapper).hide();
                  additionalAttrDOM = renderAttributes(item.attributes, false);
                  $qtyInput = $clonedWrapper.find("input[name^=updates]");
                  $qtyInput.attr("id", uniqueId).removeAttr("name").val(itemQty).bind("change", {
                    variantId: variantId,
                    uniqueId: uniqueId,
                    originalQtyInput: $variantQtyInput
                  }, function(e) {
                    /*
                                      Keeps the rest of the handlers from being executed
                                      and prevents the event from bubbling up the DOM tree.
                                    */
                    var originalQtyInput, updatedQty;
                    e.stopImmediatePropagation();
                    variantId = e.data.variantId;
                    uniqueId = e.data.uniqueId;
                    originalQtyInput = e.data.originalQtyInput;
                    updatedQty = parseInt($(this).val(), 10);
                    return updateQuantity(variantId, uniqueId, updatedQty, originalQtyInput);
                  });
                  /* 
                    Remove the inline script, then bind custom click event,
                    This handles removing the items from cart [Remove from cart] link
                  */
                  $clonedWrapper.find(removeLinkSelector).removeAttr("onclick").unbind("click").bind("click", {
                    qtyInput: $qtyInput,
                    variantId: variantId,
                    uniqueId: uniqueId,
                    originalQtyInput: $variantQtyInput
                  }, function(e) {
                    var originalQtyInput, qtyInput;
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    variantId = e.data.variantId;
                    uniqueId = e.data.uniqueId;
                    qtyInput = e.data.qtyInput;
                    originalQtyInput = e.data.originalQtyInput;
                    updateQuantity(variantId, uniqueId, 0, originalQtyInput);
                    qtyInput.val(0);
                    return $("form[action=\"/cart\"]").get(0).submit();
                  });
                  variantQty -= itemQty;
                  if (!config.appendTo) {
                    $clonedWrapper.find(":contains(" + variantTitle + "):last").get(0).innerHTML += additionalAttrDOM;
                  } else {
                    $clonedWrapper.find(config.appendTo).append(additionalAttrDOM);
                  }
                  $subTotal = $clonedWrapper.find(":contains(" + formattedPrice + "):last");
                  calcSubTotal(variantId, uniqueId, variantPrice, $subTotal, isCurrencySet);
                  $clonedWrapper.show();
                }
              }
              if (variantQty > 0) {
                $noCustomInput = $variantQtyInput.hide().clone(false).insertAfter($variantQtyInput).val(variantQty).removeAttr("name").attr("data-before", variantQty).unbind("change").show().bind("change", {
                  originalQtyInput: $variantQtyInput
                }, function(e) {
                  var $el, $originalQtyInput, originalQty, variantQtyBefore, variantQtyChange, variantQtyCurrent;
                  $el = $(this);
                  e.stopImmediatePropagation();
                  variantQtyBefore = parseInt($el.attr("data-before"), 10);
                  variantQtyCurrent = parseInt($el.val(), 10);
                  $originalQtyInput = e.data.originalQtyInput;
                  variantQtyChange = variantQtyCurrent - variantQtyBefore;
                  originalQty = parseInt($originalQtyInput.val(), 10);
                  $el.attr("data-before", variantQtyCurrent);
                  return $originalQtyInput.val(originalQty + variantQtyChange);
                });
                $inputWrapper.find(removeLinkSelector).removeAttr("onclick").unbind("click").bind("click", {
                  noCustomInput: $noCustomInput,
                  originalQtyInput: $variantQtyInput
                }, function(e) {
                  var noCustomQty;
                  e.stopImmediatePropagation();
                  e.preventDefault();
                  $noCustomInput = e.data.noCustomInput;
                  $variantQtyInput = e.data.originalQtyInput;
                  noCustomQty = parseInt($noCustomInput.val(), 10);
                  variantQty = parseInt($variantQtyInput.val(), 10);
                  $originalQtyInput.val(variantQty - noCustomInput);
                  $noCustomInput.val(0);
                  return $("form[action=\"/cart\"]").get(0).submit();
                });
                $subTotal = $inputWrapper.find(":contains(" + formattedPrice + "):last");
                subTotalNumber = variantQty * variantPrice;
                moneyFormat = Shopify.money_format;
                if (isCurrencySet) {
                  subTotalNumber = Currency.convert(subTotalNumber, Shopify.shop_currency, Currency.currentCurrency);
                  moneyFormat = Currency.money_format[Currency.currentCurrency];
                }
                $subTotal.html(Shopify.formatMoney(subTotalNumber, moneyFormat));
              } else {
                $inputWrapper.hide();
              }
            }
            $("form[action=\"/cart\"] li:has(:text):odd").addClass("even").removeClass("odd");
            $("form[action=\"/cart\"] li:has(:text):even").addClass("odd").removeClass("even");
            $("form[action=\"/cart\"] tr:has(:text):odd").addClass("even").removeClass("odd");
            $("form[action=\"/cart\"] tr:has(:text):even").addClass("odd").removeClass("even");
            $("input[name=\"checkout\"], input[name=\"goto_pp\"], input[name=\"goto_gc\"]").click(function() {
              return isToCheckOut = true;
            });
            return $("form[action=\"/cart\"]").submit(function(e) {
              if (m) {
                return false;
              }
              if (isToCheckOut) {
                e.preventDefault();
                m = true;
                return updateCartInfo(cartInfo);
              } else {
                return true;
              }
            });
          });
        }
      },
      getConfig: function() {
        return config;
      },
      clearAttributes: function() {
        cookieStore.destroy();
        return itemSpec = {};
      },
      /*
        --------------------------------------------------------------
            @Inspector
        --------------------------------------------------------------
        */
      inspectAttributes: function(u, s, q) {
        var r, t, v, w;
        t = (typeof q === "string" ? q : "  ");
        r = JSON.stringify(cookieStore.read(), null, t);
        w = document.getElementById(u || "attributes-wrapper");
        if (typeof w === "object") {
          w.innerHTML = r;
          w.style.display = "block";
        }
        v = document.getElementById(s || "hide-attributes");
        if (typeof v === "object") {
          v.style.display = "inline";
        }
        return r;
      }
    };
  })(jQuery);
}).call(this);
