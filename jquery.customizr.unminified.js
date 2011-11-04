/**
 * Cookie plugin
 *
 * Copyright (c) 2006 Klaus Hartl (stilbuero.de)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */
jQuery.cookie = function (b, j, m) {
    if (typeof j != "undefined") {
        m = m || {};
        if (j === null) {
            j = "";
            m.expires = -1
        }
        var e = "";
        if (m.expires && (typeof m.expires == "number" || m.expires.toUTCString)) {
            var f;
            if (typeof m.expires == "number") {
                f = new Date();
                f.setTime(f.getTime() + (m.expires * 24 * 60 * 60 * 1000))
            } else {
                f = m.expires
            }
            e = "; expires=" + f.toUTCString()
        }
        var l = m.path ? "; path=" + (m.path) : "";
        var g = m.domain ? "; domain=" + (m.domain) : "";
        var a = m.secure ? "; secure" : "";
        document.cookie = [b, "=", encodeURIComponent(j), e, l, g, a].join("")
    } else {
        var d = null;
        if (document.cookie && document.cookie != "") {
            var k = document.cookie.split(";");
            for (var h = 0; h < k.length; h++) {
                var c = jQuery.trim(k[h]);
                if (c.substring(0, b.length + 1) == (b + "=")) {
                    d = decodeURIComponent(c.substring(b.length + 1));
                    break
                }
            }
        }
        return d
    }
};

/**
 * JSON library by Douglas Crockford.
 *
 * This code creates a global JSON object containing two methods: stringify and parse.
 *
 */

String.prototype.capitalizeFirstLetter = function () {
    return this.charAt(0).toUpperCase() + this.slice(1)
};
String.prototype.removeCurrencyDescriptor = function () {
    return this.replace(/#\d+;/g, "").replace(/[^\d,.]/g, "")
};
Shopify.Customizr = (function (k) {
    var d = {
        selector: null,
        showLabelOnCartPage: true,
        noLabel: "No label",
        labelFormatOnCartPage: "%s: ",
        lineItemFormatInTemplatesPlainText: "%qx %t for %p each",
        attributeSeparator: " / ",
        checkboxOnValue: "yes",
        requiredText: "This field is required",
        requiredSelect: "Please select an option",
        requiredCheckbox: "This checkbox is required",
        useNativeValidation: null
    };
    var i = {};
    var p = false;
    var m = false;
    var b = {
        configuration: {
            expires: 90,
            path: "/",
            domain: window.location.hostname
        },
        name: "shopify_product_customization",
        write: function (q) {
            k.cookie(this.name, JSON.stringify(q), this.configuration)
        },
        read: function () {
            var q = {};
            var r = k.cookie(this.name);
            if (r !== null) {
                q = JSON.parse(r)
            }
            return q
        },
        destroy: function () {
            k.cookie(this.name, null, this.configuration)
        }
    };
    var e = function (q, s) {
            if (s === "required") {
                var r = navigator.userAgent.toLowerCase();
                if (r.indexOf("chrome") !== -1) {
                    return true
                }
                if (r.indexOf("safari") !== -1) {
                    return false
                }
            }
            var t = document.createElement(q);
            if (s in t) {
                return true
            } else {
                return false
            }
        };
    var f = function (t) {
            var s = t.attr("data-label");
            if (s) {
                return s
            }
            var u = t.attr("id");
            if (u) {
                label = k.trim(k("label[for=" + u + "]").text().replace(":", ""));
                if (label) {
                    return label
                }
            }
            var r = t.attr("name");
            var q = r.match(/attributes\[([\w-]+)\]/);
            if (q !== null) {
                return q[1].replace(/(-|_)/g, " ").capitalizeFirstLetter()
            } else {
                if (r) {
                    return r.replace(/(-|_)/g, " ").capitalizeFirstLetter()
                } else {
                    return d.noLabel
                }
            }
        };
    var c = function (r) {
            if (d.useNativeValidation) {
                r.attr("required", "required")
            } else {
                if (!(r.parent().is(".error"))) {
                    var q = r.attr("data-error");
                    if (!q) {
                        if (r.is(":checkbox")) {
                            q = d.requiredCheckbox
                        } else {
                            if (r.is("select")) {
                                q = d.requiredSelect
                            } else {
                                q = d.requiredText
                            }
                        }
                    }
                    r.wrap('<span class="error"></span>');
                    r.after("<span>" + q + "</span>");
                    r.blur(function () {
                        var s = r.val();
                        if (s) {
                            r.parent().find("span").remove();
                            r.unwrap();
                            k(this).unbind("blur")
                        }
                    })
                }
            }
        };
    var h = function (q) {
            return (q.attr("required") || q.is(".required"))
        };
    var l = function (q) {
            var s = "";
            if (typeof q.length === "number") {
                for (var r = 0; r < q.length; r++) {
                    s += d.attributeSeparator;
                    if (d.showLabelOnCartPage && q[r].label !== d.noLabel) {
                        s += d.labelFormatOnCartPage.replace("%s", q[r].label)
                    }
                    s += q[r].value
                }
            }
            return s
        };
    var j = function (q, x, r, u) {
            for (var t = 0; t < i[q].length; t++) {
                if (i[q][t].uniqueId === x) {
                    var s = i[q][t].quantity;
                    i[q][t].quantity = r;
                    var w = r - s;
                    var v = parseInt(u.val(), 10);
                    u.val(v + w);
                    if (r === 0) {
                        i[q].splice(t, 1);
                        if (i[q].length === 0) {
                            i[q] = undefined
                        }
                    }
                    b.write(i);
                    break
                }
            }
        };
    var o = function (r, x, q, w, s) {
            for (var t = 0; t < i[r].length; t++) {
                if (i[r][t].uniqueId === x) {
                    var v = i[r][t].quantity * q;
                    var u = Shopify.money_format;
                    if (s) {
                        v = Currency.convert(v, Shopify.shop_currency, Currency.currentCurrency);
                        u = Currency.money_format[Currency.currentCurrency]
                    }
                    w.html(Shopify.formatMoney(v, u));
                    break
                }
            }
        };
    var n = function (q) {
            if ((typeof Currency === "object") && (typeof Currency.convertAll === "function")) {
                return Currency.currentCurrency && (Currency.currentCurrency !== q)
            } else {
                return false
            }
        };
    var a = function () {
            k('form[action="/cart"]').attr("action", "/checkout").get(0).submit()
        };
    var g = function (q) {
            var r = "";
            k.each(q, function (x, z) {
                if (i[x] !== undefined && i[x].length > 0) {
                    var y = "\n" + d.lineItemFormatInTemplatesPlainText;
                    var w = z.title;
                    var v = z.quantity;
                    var u = z.price;
                    var t = Shopify.formatMoney(u);
                    var A = t.removeCurrencyDescriptor();
                    r += "attributes[" + w + "]=";
                    k.each(i[x], function (B, D) {
                        var E = D.quantity;
                        var C = "<p>" + l(D.attributes) + "</p>";
                        var C = w + " " + jQuery(C).text();
                        r += y.replace("%q", E).replace("%t", C).replace("%p", A);
                        v = v - D.quantity
                    });
                    if (v > 0) {
                        r += y.replace("%q", v).replace("%t", w).replace("%p", A)
                    }
                    r += "&"
                } else {
                    r += "attributes[" + w + "]=&"
                }
            });
            var s = {
                type: "POST",
                url: "/cart/update.js",
                data: r,
                dataType: "json",
                success: a
            };
            k.ajax(s)
        };
    return {
        attach: function (q) {
            k.extend(d, q || {});
            if (d.useNativeValidation === null) {
                d.useNativeValidation = e("input", "required")
            }
            if (window.location.pathname.indexOf("/products/") !== -1) {
                i = b.read();
                k.ajaxSetup({
                    cache: false
                });
                k.getJSON("/cart.js", function (r) {
                    if (r.item_count === 0) {
                        i = {};
                        b.destroy()
                    }
                });
                k(function () {
                    if (d.useNativeValidation && k("script[src*=ajax]").size()) {
                        d.useNativeValidation = false
                    }
                    var t = k('form[action="/cart/add"]');
                    var r = t.find("input:submit, input:image");
                    var s = r.attr("onclick");
                    r.removeAttr("onclick");
                    r.click(function (u) {
                        var C = t.find("[name=id]").val();
                        var y = parseInt(t.find("[name=quantity]").val(), 10) || 1;
                        var A = (new Date()).getTime();
                        var x = true;
                        if (C) {
                            var v = [];
                            var w;
                            if (d.selector === null) {
                                w = t.find("input:enabled,select:enabled").not("input:submit").not("input:image").not("input:file").not('[name^="id"]').not('[name="quantity"]').not(".single-option-selector")
                            } else {
                                w = k(d.selector)
                            }
                            w.each(function (E) {
                                var F = "";
                                if (k(this).is(":checkbox")) {
                                    if (k(this).is(":checked")) {
                                        F = k(this).val();
                                        if (F === "on" || F === "") {
                                            F = d.checkboxOnValue
                                        }
                                    } else {
                                        if (h(k(this))) {
                                            x = false;
                                            c(k(this))
                                        }
                                        return
                                    }
                                } else {
                                    if (k(this).is(":radio")) {
                                        if (k(this).is(":checked")) {
                                            F = k(this).val();
                                            if (F === "") {
                                                return
                                            }
                                        } else {
                                            return
                                        }
                                    } else {
                                        F = k(this).val();
                                        if (F === "" || F === undefined) {
                                            if (h(k(this))) {
                                                x = false;
                                                c(k(this))
                                            }
                                            return
                                        }
                                    }
                                }
                                var D = f(k(this));
                                v.push({
                                    label: D,
                                    value: F
                                })
                            });
                            if (x) {
                                if (v.length) {
                                    i[C] = i[C] || [];
                                    var B = false;
                                    for (var z = 0; z < i[C].length; z++) {
                                        if (JSON.stringify(i[C][z].attributes) === JSON.stringify(v)) {
                                            i[C][z].quantity += y;
                                            B = true;
                                            break
                                        }
                                    }
                                    if (!B) {
                                        i[C].push({
                                            uniqueId: A,
                                            quantity: y,
                                            attributes: v
                                        })
                                    }
                                    b.write(i)
                                }
                                if (typeof s === "function") {
                                    s.call();
                                    return false
                                } else {
                                    return true
                                }
                            } else {
                                k("span.error :input:eq(0)").trigger("focus");
                                if (d.useNativeValidation) {
                                    return true
                                } else {
                                    return false
                                }
                            }
                        }
                    })
                })
            }
        },
        show: function (u, s, v, t) {
            k.extend(d, t || {});
            var r = {};
            if (typeof u.total_price === "number") {
                var q = u.items;
                k.each(q, function (w, y) {
                    var x = y.id.toString();
                    r[x] = {};
                    r[x].title = y.title;
                    r[x].price = y.price;
                    r[x].linePrice = y.line_price;
                    r[x].quantity = y.quantity
                })
            } else {
                r = u
            }
            Shopify.money_format = s || Shopify.money_format || "$ {{amount}}";
            Shopify.shop_currency = v || "USD";
            if (window.location.pathname === "/cart") {
                i = b.read();
                k(function () {
                    k("input[name^=updates]").each(function () {
                        var x = k(this).attr("id").replace("updates_", "");
                        k(this).attr("name", "updates[" + x + "]")
                    });
                    var w = n(Shopify.shop_currency);
                    k.each(i, function (D, T) {
                        var D = D;
                        var N = "#updates_" + D;
                        var A = r[D].title;
                        var U = r[D].price;
                        var z = r[D].linePrice;
                        var O = '[href^="/cart/change/"], [onclick]';
                        var I = k(N).parents("tr");
                        var C = k(N).parents("li");
                        if (I.add(C).size() === 0) {
                            i[D] = undefined;
                            b.write(i);
                            return
                        }
                        var x = I.length ? I : C;
                        var L = I.length ? "tr" : "li";
                        var V = x.find("input[name^=updates]");
                        var S = parseInt(V.val(), 10);
                        var K = S;
                        var J = Shopify.money_format;
                        if (w) {
                            z = Currency.convert(z, Shopify.shop_currency, Currency.currentCurrency);
                            J = Currency.money_format[Currency.currentCurrency]
                        }
                        var Q = Shopify.formatMoney(z, J).removeCurrencyDescriptor();
                        for (var P = 0; P < T.length; P++) {
                            if ((typeof T[P] === "object") && (typeof T[P].quantity === "number") && (T[P].quantity > 0)) {
                                var G = T[P].uniqueId;
                                var H = l(T[P].attributes);
                                var F = T[P].quantity;
                                var R = x.clone(false).insertAfter(x).hide();
                                var y = R.find("input[name^=updates]");
                                y.attr("id", G).removeAttr("name").val(F).bind("change", {
                                    variantId: D,
                                    uniqueId: G,
                                    originalQtyInput: V
                                }, function (Y) {
                                    Y.stopImmediatePropagation();
                                    var W = Y.data.variantId,
                                        Z = Y.data.uniqueId,
                                        X = Y.data.originalQtyInput;
                                    j(W, Z, parseInt(k(this).val(), 10), X)
                                });
                                R.find(O).removeAttr("onclick").unbind("click").bind("click", {
                                    qtyInput: y,
                                    variantId: D,
                                    uniqueId: G,
                                    originalQtyInput: V
                                }, function (Y) {
                                    Y.stopImmediatePropagation();
                                    Y.preventDefault();
                                    var W = Y.data.variantId,
                                        aa = Y.data.uniqueId,
                                        X = Y.data.originalQtyInput,
                                        Z = Y.data.qtyInput;
                                    j(W, aa, 0, X);
                                    Z.val(0);
                                    k('form[action="/cart"]').get(0).submit()
                                });
                                K -= F;
                                R.find(":contains(" + A + "):last").get(0).innerHTML += H;
                                var B = R.find(":contains(" + Q + "):last");
                                o(D, G, U, B, w);
                                R.show()
                            }
                        }
                        if (K > 0) {
                            var E = V.hide().clone(false).insertAfter(V).val(K).removeAttr("name").attr("data-before", K).unbind("change").show().bind("change", {
                                originalQtyInput: V
                            }, function (Z) {
                                Z.stopImmediatePropagation();
                                var X = parseInt(k(this).attr("data-before"), 10),
                                    W = parseInt(k(this).val(), 10),
                                    Y = Z.data.originalQtyInput;
                                var ab = W - X;
                                var aa = parseInt(Y.val(), 10);
                                k(this).attr("data-before", W);
                                Y.val(aa + ab)
                            });
                            x.find(O).removeAttr("onclick").unbind("click").bind("click", {
                                noCustomInput: E,
                                originalQtyInput: V
                            }, function (aa) {
                                aa.stopImmediatePropagation();
                                aa.preventDefault();
                                var Y = aa.data.noCustomInput,
                                    Z = aa.data.originalQtyInput;
                                var X = parseInt(Y.val(), 10);
                                var W = 0;
                                var ac = W - X;
                                var ab = parseInt(Z.val(), 10);
                                Z.val(ab + ac);
                                Y.val(0);
                                k('form[action="/cart"]').get(0).submit()
                            });
                            var B = x.find(":contains(" + Q + "):last");
                            var M = K * U;
                            var J = Shopify.money_format;
                            if (w) {
                                M = Currency.convert(M, Shopify.shop_currency, Currency.currentCurrency);
                                J = Currency.money_format[Currency.currentCurrency]
                            }
                            B.html(Shopify.formatMoney(M, J))
                        } else {
                            x.hide()
                        }
                    });
                    k('form[action="/cart"] li:has(:text):odd').addClass("even").removeClass("odd");
                    k('form[action="/cart"] li:has(:text):even').addClass("odd").removeClass("even");
                    k('form[action="/cart"] tr:has(:text):odd').addClass("even").removeClass("odd");
                    k('form[action="/cart"] tr:has(:text):even').addClass("odd").removeClass("even");
                    k('input[name="checkout"], input[name="goto_pp"], input[name="goto_gc"]').click(function () {
                        p = true
                    });
                    k('form[action="/cart"]').submit(function (x) {
                        if (m) {
                            return false
                        }
                        if (p) {
                            m = true;
                            x.preventDefault();
                            g(r)
                        } else {
                            return true
                        }
                    })
                })
            }
        },
        getConfig: function () {
            return d
        },
        clearAttributes: function () {
            b.destroy();
            i = {}
        },
        inspectAttributes: function (u, s, q) {
            var t = typeof q === "string" ? q : "  ";
            var r = JSON.stringify(b.read(), null, t);
            var w = document.getElementById(u || "attributes-wrapper");
            if (typeof w === "object") {
                w.innerHTML = r;
                w.style.display = "block"
            }
            var v = document.getElementById(s || "hide-attributes");
            if (typeof v === "object") {
                v.style.display = "inline"
            }
            return r
        }
    }
})(jQuery);
