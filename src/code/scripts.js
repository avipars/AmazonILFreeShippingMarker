var shippingMarker,
    extensionRan = false,
    debugMode = false;

chrome.extension.sendMessage({}, function(response) {
    var readyStateCheckInterval = setInterval(function() {
        if (document.readyState === "interactive") {
            clearInterval(readyStateCheckInterval);

            $(document).ready(function() {
                shippingMarker = new amazonShippingMarker(debugMode);
                extensionRan = true;
            });
        }
    }, 10);
});
chrome.extension.sendMessage({}, function(response) {
    var readyStateCheckInterval = setInterval(function() {
        if (document.readyState === "complete") {
            clearInterval(readyStateCheckInterval);

            if (!extensionRan) {
                $(document).ready(function() {
                    shippingMarker = new amazonShippingMarker(debugMode);
                    extensionRan = true;
                });
            }
        }
    }, 10);
});

function amazonShippingMarker(debug = false) {
    this.currentPage = location.href;
    this.styleClass = 'amazonFreeShipping';
    this.inCart = (this.currentPage.indexOf('/cart/') != -1) ? true : false;
    this.inProduct = (this.currentPage.indexOf('/product/') != -1 || this.currentPage.indexOf('/dp/') != -1) ? true : false;
    this.inOrdersHistory = (this.currentPage.indexOf('/order-history') != -1) ? true : false;
    this.inCatalog = (!this.inCart && !this.inProduct && !this.inOrdersHistory) ? true : false;
    this.debug = debug;
    this.messages = {
        'countryOnly': 'FREE Shipping to Israel',
        'countryAndAmount': 'Eligible for FREE Shipping on qualifying orders over $65.00',
        'countryAndQualified': 'FREE Shipping to Israel on qualifying orders over ',
        'countryAndQualified2': 'Eligible for FREE Shipping on qualifying',
        'eligible1': 'FREE Shipping to Israel when you spend over $65.00 on eligible items',
        'paidShipping': 'Ships to Israel',
        'paidShipping2': 'Shipping to Israel',
        'noShipping': 'This item does not ship to',
    };
    this.default_colors = {
        'freeShippingUnder49': { bg: '#f1f1f1', text: false },
        'freeShippingAbove49': { bg: '#f1f1f1', text: false },
        'paidShipping': { bg: false, text: false },
        'noShipping': { bg: false, text: false },
    };
    this.tracking_orders = true;
    this.init();
}

amazonShippingMarker.prototype = {
    init: function() {
        if (this.debug) {
            console.log('in cart: ' + this.inCart);
            console.log('in product: ' + this.inProduct);
            console.log('in catalog: ' + this.inCatalog);
            console.log('in order history: ' + this.inOrdersHistory);
        }

        // Set colors from user settings or default
        this.setColorSettings();


        var _this = this,
            settings_tracking_orders_name = 'tracking_information_orders_page';

        chrome.storage.sync.get(settings_tracking_orders_name, function(obj) {
            try {
                if (obj[settings_tracking_orders_name]) {
                    _this.tracking_orders = obj[settings_tracking_orders_name].enabled;
                }
            } catch (e) {

            }
        });

        setTimeout(() => {

            // Mark products based on current page
            if (_this.inCatalog) {
                _this.markCatalogProducts();
            } else if (_this.inProduct) {
                _this.markProductPage();
                _this.detectProductUrlChange();
            } else if (_this.inCart) {
                _this.markCartProducts();
            } else if (_this.inOrdersHistory && _this.tracking_orders) {
                _this.showOrderTrackingNumbers();
            }
        }, 50);

    },

    setColorSettings: function() {

        var _this = this,
            color_names = Object.keys(this.default_colors),
            color_name = "";
        for (var i = 0; i < color_names.length; i++) {
            color_name = color_names[i];

            var getColorSettings = function(color_name) {
                chrome.storage.sync.get(color_name, function(obj) {
                    if (obj[color_name]) {
                        _this.default_colors[color_name].bg = obj[color_name].bg;
                        _this.default_colors[color_name].text = obj[color_name].text;
                    }
                });
            };

            getColorSettings(color_name);

        } //for
    },

    getCssByColorSetting: function(color_name) {
        if (!this.default_colors[color_name]) return;
        if (!this.default_colors[color_name].bg) return;
        var text_color = (this.default_colors[color_name].text) ? 'color: #ffffff;' : '';
        return ' style="background-color:' + this.default_colors[color_name].bg + ';' + text_color + '"';
    },

    markCatalogProducts: function() {

        try {
            if (this.default_colors.freeShippingAbove49.bg) {
                $('div.s-align-children-center:textEquals("' + this.messages.countryOnly + '")').parents('div[data-asin]').addClass(this.styleClass).css({
                    'background-color': this.default_colors.freeShippingAbove49.bg,
                    'color': (this.default_colors.freeShippingAbove49.text) ? '#ffffff' : 'inherit'
                });
            }
            if (this.default_colors.freeShippingUnder49.bg) {
                $('div.s-align-children-center:contains("' + this.messages.countryAndQualified + '")').parents('div[data-asin]').addClass(this.styleClass).css({
                    'background-color': this.default_colors.freeShippingUnder49.bg,
                    'color': (this.default_colors.freeShippingUnder49.text) ? '#ffffff' : 'inherit'
                });
            }

            if (this.default_colors.paidShipping.bg) {
                $('div.s-align-children-center:contains("' + this.messages.paidShipping + '")').parents('div[data-asin]').addClass(this.styleClass).css({
                    'background-color': this.default_colors.paidShipping.bg,
                    'color': (this.default_colors.paidShipping.text) ? '#ffffff' : 'inherit'
                });
            }

            if (this.default_colors.noShipping.bg) {
                $('div.s-search-results div.s-result-item > div.sg-col-inner:not(:has(div.s-align-children-center))').parents('div[data-asin]').addClass(this.styleClass).css({
                    'background-color': this.default_colors.noShipping.bg,
                    'color': (this.default_colors.noShipping.text) ? '#ffffff' : 'inherit'
                });
            }

            if (this.debug) console.log('marked products in catalog page');
        } catch (e) {

        }
    },

    markCartProducts: function() {

        try {

            var _this = this;
            var markProductInCart = function() {

                if (_this.default_colors.freeShippingAbove49.bg) {
                    $('div.sc-list-item-content:contains("' + _this.messages.countryOnly + '.")').parents('div[data-asin]').addClass(_this.styleClass).css({
                        'background-color': _this.default_colors.freeShippingAbove49.bg,
                        'color': (_this.default_colors.freeShippingAbove49.text) ? '#ffffff' : 'inherit',
                        'padding-left': '5px'
                    });
                }
                if (_this.default_colors.freeShippingUnder49.bg) {

                    $('div.sc-list-item-content:contains("' + _this.messages.countryAndQualified + '")').parents('div[data-asin]').addClass(_this.styleClass).css({
                        'background-color': _this.default_colors.freeShippingUnder49.bg,
                        'color': (_this.default_colors.freeShippingUnder49.text) ? '#ffffff' : 'inherit',
                        'padding-left': '5px'
                    });
                }

                if (_this.default_colors.freeShippingUnder49.bg) {

                    $('div.sc-list-item-content:contains("' + _this.messages.eligible1 + '")').parents('div[data-asin]').addClass(_this.styleClass).css({
                        'background-color': _this.default_colors.freeShippingUnder49.bg,
                        'color': (_this.default_colors.freeShippingUnder49.text) ? '#ffffff' : 'inherit',
                        'padding-left': '5px'
                    });
                }

                if (_this.default_colors.freeShippingAbove49.bg) {
                    $('div.sc-list-item-content:contains("' + _this.messages.eligible1 + '.")').parents('div[data-asin]').addClass(_this.styleClass).css({
                        'background-color': _this.default_colors.freeShippingAbove49.bg,
                        'color': (_this.default_colors.freeShippingAbove49.text) ? '#ffffff' : 'inherit',
                        'padding-left': '5px'
                    });
                }

                if (_this.default_colors.paidShipping.bg) {
                    $('div.sc-list-item-content:contains("' + _this.messages.paidShipping + '")').parents('div[data-asin]').addClass(_this.styleClass).css({
                        'background-color': _this.default_colors.paidShipping.bg,
                        'color': (_this.default_colors.paidShipping.text) ? '#ffffff' : 'inherit',
                        'padding-left': '5px'
                    });
                }

                if (_this.default_colors.noShipping.bg) {
                    $('div.s-search-results div.s-result-item > div.sg-col-inner:not(:has(div.s-align-children-center))').parents('div[data-asin]').addClass(_this.styleClass).css({
                        'background-color': _this.default_colors.noShipping.bg,
                        'color': (_this.default_colors.noShipping.text) ? '#ffffff' : 'inherit',
                        'padding-left': '5px'
                    });
                }


            };

            markProductInCart();

            $("#sc-saved-cart-items").bind("DOMSubtreeModified", function() {
                markProductInCart();
            });

            $(".sc-list-body").bind("DOMSubtreeModified", function() {
                markProductInCart();
            });

            if (this.debug) console.log('marked products in cart page');
        } catch (e) {

        }
    },

    markProductPage: function() {

        try {
            var isShipMsg = $('#delivery-message');
            if (isShipMsg) {
                if (isShipMsg.text().indexOf(this.messages.noShipping) != -1 && isShipMsg.text().indexOf('Israel') != -1) {
                    isShipMsg.css({ 'background-color': 'rgba(181, 35, 35, 1)', 'color': '#ffffff', 'padding-left': '5px', 'padding-bottom': '5px' }).find('a').css('color', '#ffffff');
                    if (this.debug) console.log('product page - product does not ship to Israel');
                    return;
                }
            }

            var isUnder49 = $('div#price:contains("' + this.messages.countryAndQualified + '"),div#price:contains("' + this.messages.countryAndQualified2 + '")').length,
                isAbove49 = $('div#price:contains("' + this.messages.countryOnly + '")').length;
            if (isUnder49 > 0) {
                if (this.default_colors.freeShippingUnder49.bg) {
                    $('div.a-box-inner:contains("' + this.messages.countryAndQualified + '"),div.a-box-inner:contains("' + this.messages.countryAndQualified2 + '")').addClass(this.styleClass).css({
                        'background-color': this.default_colors.freeShippingUnder49.bg,
                        'color': (this.default_colors.freeShippingUnder49.text) ? '#ffffff' : 'inherit'
                    }).find('.accordion-row-content').addClass(this.styleClass).css({
                        'background-color': this.default_colors.freeShippingUnder49.bg,
                        'color': (this.default_colors.freeShippingUnder49.text) ? '#ffffff' : 'inherit'
                    });
                    $('div#price:contains("' + this.messages.countryAndQualified + '"),div#price:contains("' + this.messages.countryAndQualified2 + '")').addClass(this.styleClass).css({
                        'background-color': this.default_colors.freeShippingUnder49.bg,
                        'color': (this.default_colors.freeShippingUnder49.text) ? '#ffffff' : 'inherit'
                    });
                }
            } else if (isAbove49 > 0) {
                if (this.default_colors.freeShippingAbove49.bg) {
                    $('div.a-box-inner:contains("' + this.messages.countryOnly + '")').addClass(this.styleClass).css({
                        'background-color': this.default_colors.freeShippingAbove49.bg,
                        'color': (this.default_colors.freeShippingAbove49.text) ? '#ffffff' : 'inherit'
                    }).find('.accordion-row-content').addClass(this.styleClass).css({
                        'background-color': this.default_colors.freeShippingUnder49.bg,
                        'color': (this.default_colors.freeShippingUnder49.text) ? '#ffffff' : 'inherit'
                    });
                    $('div#price:contains("' + this.messages.countryOnly + '")').addClass(this.styleClass).css({
                        'background-color': this.default_colors.freeShippingAbove49.bg,
                        'color': (this.default_colors.freeShippingAbove49.text) ? '#ffffff' : 'inherit'
                    });
                }
            } else {
                if (this.default_colors.paidShipping.bg) {
                    $('div.a-box-inner:contains("' + this.messages.paidShipping2 + '")').addClass(this.styleClass).css({
                        'background-color': this.default_colors.paidShipping.bg,
                        'color': (this.default_colors.paidShipping.text) ? '#ffffff' : 'inherit'
                    }).find('.accordion-row-content').addClass(this.styleClass).css({
                        'background-color': this.default_colors.freeShippingUnder49.bg,
                        'color': (this.default_colors.freeShippingUnder49.text) ? '#ffffff' : 'inherit'
                    });
                    $('div#price:contains("' + this.messages.paidShipping2 + '")').addClass(this.styleClass).css({
                        'background-color': this.default_colors.paidShipping.bg,
                        'color': (this.default_colors.paidShipping.text) ? '#ffffff' : 'inherit'
                    });
                }
            }

            if (this.debug) {
                console.log('marked product in product page');
            }

        } catch (e) {

        }
    },

    detectProductUrlChange: function() {
        var _this = this;
        this.productInterval = setInterval(function() {
            if (_this.currentPage != location.href) {
                _this.currentPage = location.href;
                _this.markProductPage();
            }
        }, 700);

    },

    showOrderTrackingNumbers: function() {

        try {
            var $orders = $('.a-box-group.order div.shipment'),
                _this = this;
            if ($orders) {
                $orders.each(function() {
                    var $order, $shipmentRow, $trackingBtn, trackingHtml, trackingHtml, trackingId, trackingDelay, trackingLastStatus;
                    $order = $(this);
                    $shipmentRow = $order.find('.js-shipment-info-container');
                    $trackingBtn = $shipmentRow.find('.track-package-button');
                    if (!$shipmentRow) return;
                    if (!$shipmentRow.find('.a-color-success')) return;
                    if (!$trackingBtn) return;

                    if (!$trackingBtn.find('a').attr('href')) return;
                    var url = location.origin + $trackingBtn.find('a').attr('href');

                    $.ajax({
                            url: url,
                            cache: false
                        })
                        .done(function(html) {
                            if (html.indexOf('<div id="carrierRelatedInfo-container"') == -1) { return; }

                            trackingDetails = "";
                            trackingId = "";
                            trackingDelay = "";
                            trackingLastStatus = "";

                            trackingHtml = html.substring(html.indexOf('<div id="carrierRelatedInfo-container"'));
                            trackingHtml = trackingHtml.substring(0, trackingHtml.indexOf('<div class="a-column a-span4">') - 1);
                            if (trackingHtml.length > 50) {
                                try {
                                    trackingHtml = trackingHtml.replace('widgetHeader', 'a-size-medium a-text-bold');
                                    trackingHtml = trackingHtml.replace('a-row a-spacing-small cardContainer-wrapper', 'a-row cardContainer-wrapper');

                                    var shippingCompany = trackingHtml.substring(trackingHtml.indexOf('<h1'));
                                    shippingCompany = shippingCompany.substring(0, shippingCompany.indexOf('</h1>') - 1);

                                    trackingHtml += '<shippingCompany>';

                                    if (html.indexOf('<div class="a-row a-spacing-large lexicalExceptionMessage-container">') !== -1) {
                                        trackingDelay = html.substring(html.indexOf('<div class="a-row a-spacing-large lexicalExceptionMessage-container">') + '<div class="a-row a-spacing-large lexicalExceptionMessage-container">'.length);
                                        trackingDelay = trackingDelay.substring(0, trackingDelay.indexOf('</h3>') + 5);

                                        if (trackingDelay.length > 5) {
                                            trackingHtml += '<div class="a-box-inner order_delay_message">' + trackingDelay + '</div>';
                                        }
                                    }

                                    if (html.indexOf('<div id="tracking-events-container" class="tracking-events-modal-inner">') !== -1) {
                                        trackingDetails = html.substring(html.indexOf('<div id="tracking-events-container" class="tracking-events-modal-inner">') + '<div id="tracking-events-container" class="tracking-events-modal-inner">'.length);
                                        trackingDetails = trackingDetails.substring(0, trackingDetails.indexOf('<div class="a-row tracking-event-timezoneLabel">') - '<div class="a-row tracking-event-timezoneLabel">'.length);
                                        trackingDetails = trackingDetails.replace('<h2', '<h2 style="display:none;"').replace('<h4', '<h4 style="display:none;"');

                                        if (trackingDetails.length > 10) {
                                            if (trackingHtml.indexOf('<h4') != -1) {
                                                trackingId = trackingHtml.substring(trackingHtml.indexOf('<h4'), trackingHtml.indexOf('</h4>'));
                                            } else {
                                                trackingId = trackingHtml.substring(trackingHtml.indexOf('href="#">') + 9, trackingHtml.indexOf('</a>'));
                                            }
                                            if (trackingId.length > 5) {
                                                trackingId = trackingId.replace(/(<([^>]+)>)/ig, "").replace('Tracking ID: ', 'tid_');
                                                trackingHtml = trackingHtml.replace('href="#">', 'href="#" onclick="document.getElementById(\'' + trackingId + '\').style.display = (document.getElementById(\'' + trackingId + '\').style.display!=\'block\') ? \'block\' : \'none\';">')
                                            }

                                            if (trackingDetails.indexOf('a-span-last">') != -1) {
                                                trackingLastStatus = trackingDetails.substring(trackingDetails.indexOf('a-span-last">') + 'a-span-last">'.length);
                                                trackingLastStatus = trackingLastStatus.replace('</div>', '</temp_div');
                                                trackingLastStatus = trackingLastStatus.substring(0, trackingLastStatus.indexOf('</div>') + 6);
                                                trackingLastStatus = trackingLastStatus.replace('</temp_div', '</div>').replace(/a-row/g, '').replace('<span class="tracking-event-location"></span>', '');

                                                if (trackingLastStatus.length > 10 && trackingHtml.indexOf('</a>') !== -1) {
                                                    trackingHtml = trackingHtml.replace('</a>', '</a> <div class="order_last_status">(<strong>Last Status:</strong> ' + trackingLastStatus + ')</div>');
                                                }
                                            }

                                            trackingHtml += '<div class="order_tracking_info" id="' + trackingId + '">' + trackingDetails + '</div>';
                                        }
                                    }

                                    shippingCompany = _this.getShippingCompanyIcon(shippingCompany, trackingId);
                                    trackingHtml = trackingHtml.replace('<shippingCompany>', shippingCompany);

                                    $order.after('<div class="a-box"><div class="a-box-inner tracking_information_wrapper">' + trackingHtml + '</div></div>');

                                } catch (e) {

                                }
                            }
                        });

                });
            } // if $orders

            if (this.debug) console.log('show order tracking numbers in orders history page');
        } catch (e) {

        }
    },

    getShippingCompanyIcon: function(text, tid) {
        if (text.length == 0) return;
        text = text.replace(/(<([^>]+)>)/ig, "").replace('Shipped with ', '');
        if (text.length == 0) return;

        var imageName = '',
            trackingUrl = '';

        switch (text.toLowerCase().trim()) {
            case 'ups':
                imageName = 'ups';
                trackingUrl = 'https://www.ups.com/track?tracknum=%tid%';
                break;
            case 'dhl':
                imageName = 'dhl';
                trackingUrl = 'https://www.dhl.com/en/express/tracking.html?AWB=%tid%&brand=DHL';
                break;
            case 'fedex':
                imageName = 'fedex';
                trackingUrl = 'https://www.fedex.com/apps/fedextrack/?action=track&trackingnumber=%tid%';
                break;
            case 'aramex':
                imageName = 'aramex';
                trackingUrl = 'https://www.aramex.com/track/results?mode=0&ShipmentNumber=%tid%';
                break;
            case 'israel postal company':
                imageName = 'israel-post';
                trackingUrl = 'https://mypost.israelpost.co.il/%D7%9E%D7%A2%D7%A7%D7%91-%D7%9E%D7%A9%D7%9C%D7%95%D7%97%D7%99%D7%9D?OpenForm&L=HE&location=SHLIHIM&itemcode=%tid%';
                break;
            case 'i-parcel':
                imageName = 'i-parcel';
                trackingUrl = 'https://tracking.i-parcel.com/?TrackingNumber=%tid%';
                break;
        }


        if (imageName.length > 0) {
            imageName = '<img src="' + chrome.extension.getURL('src/shipping-icons/' + imageName + '.png') + '" class="order_shipping_company" />';

            if (tid.length > 0) {
                tid = tid.replace('tid_', '');
                imageName = '<a href="' + trackingUrl.replace('%tid%', tid) + '" target="_blank">' + imageName + '</a>';
            }
        }
        return imageName;
    }

};

$.expr[':'].textEquals = $.expr.createPseudo(function(arg) {
    return function(elem) {
        return $(elem).text().match("^" + arg + "$");
    };
});