var trumbopluginsloaded = false;
function loadTrumboPlugins() {
    // Odd way to load plugins outside angular context, as there is no plugin loader in module ngx-trumbowyg
    if (trumbopluginsloaded) return;
    console.log("Loading trumbowyg editor plugins");
    loadUploadPlugin();
    loadFlxPasteImgPlugin();
    loadCDNImagePlugin();
    trumbopluginsloaded = true;
}

function loadCDNImagePlugin() {
    var defaultOptions = {};
    function buildButtonDef(trumbowyg) {
        return {
            fn: function () {
                // Plugin button clicked
                trumbowyg.saveRange();
                var prefix = trumbowyg.o.prefix;
                var iconFolder = '<mat-icon class="mat-icon material-icons mat-icon-no-color" role="img" aria-hidden="true">folder_open</mat-icon>';
                var iconFile = '<mat-icon class="mat-icon material-icons mat-icon-no-color" role="img" aria-hidden="true">description</mat-icon>';
                var closeBtn = '<button class="'+prefix+'cdnb-close" style="cursor: pointer; float: right; height: 20px;" title="' + trumbowyg.lang.close + '"><svg><use xlink:href="' + trumbowyg.svgPath + '#' + prefix + 'close"/></svg></button>';
                var modalHTML = '<div style="padding: 10px 20px; text-align: left;">'+closeBtn+'<h4>Browse CDN Images</h4><div class="' + prefix + 'cdnb-modal"></div></div>';
                modalHTML += '<style>.cdnfb {margin: 0; padding: 0; list-style: none; border-top: 1px solid lightgray;} .cdnfb li {padding: 6px; margin:0; cursor: pointer; border-bottom: 1px solid lightgray; vertical-align: middle; color: black;} .cdnfb span { vertical-align: super; }</style>';
                var $modal = trumbowyg.openModal(null, modalHTML, false);
                
                var $CDNModal = $('.' + prefix + 'cdnb-modal');
                var $CDNClose = $('.' + prefix + 'cdnb-close');
                $CDNClose.one('click', function() {
                    $CDNModal.trigger('tbwcancel');
                });

                window.pubfn.CDNListFiles('', listFilesCB);

                // Listen clicks on modal box buttons
                $modal.on('tbwselect', function(e, imgurl){
                    console.log("Insert image from CDN", imgurl);
                    trumbowyg.restoreRange();
                    trumbowyg.execCmd('insertImage', imgurl, false, true);
                    trumbowyg.closeModal();
                });
                $modal.on('tbwcancel', function(e){
                    trumbowyg.closeModal();
                });
                function listFilesCB(err, data) {
                    if (err) {
                        alert("Failed to get file list of CDN");
                    } else {
                        var CDNURL = data.CDNURL;
                        var lstHTML = '';
                        if (data.folder !== '') lstHTML+='<li key="'+data.parentfolder+'" otype="Folder">'+iconFolder+' <span>..</span></li>';
                        for (var i=0; i<data.lst.length; i++) {
                            lstHTML+='<li key="'+data.lst[i].Key+'" otype="'+data.lst[i].otype+'">'+(data.lst[i].otype==='Folder'?iconFolder:iconFile)+' <span>'+data.lst[i].label+'</span></li>';
                        };
                        $CDNModal.html('<ul class="cdnfb">'+lstHTML+'</ul>');
                        $('.' + prefix + 'cdnb-modal li').one('click', function() {
                            if ($(this).attr('otype') === "Folder") {
                                window.pubfn.CDNListFiles($(this).attr('key'), listFilesCB)
                            } else {
                                var fullURL = CDNURL+$(this).attr('key');
                                $CDNModal.trigger('tbwselect', fullURL);
                            }
                        });
                    }
                }
            }
        }
    }

    $.extend(true, $.trumbowyg, {
        // Add some translations
        langs: {
            en: { cdnplugin: 'Insert image from CDN' }
        },
        // Register plugin in Trumbowyg
        plugins: {
            cdnplugin: {
                // Code called by Trumbowyg core to register the plugin
                init: function (trumbowyg) {
                    // Fill current Trumbowyg instance with the plugin default options
                    trumbowyg.o.plugins.cdnplugin = $.extend(true, {},
                        defaultOptions,
                        trumbowyg.o.plugins.cdnplugin || {}
                    );
                    trumbowyg.addBtnDef('cdnplugin', buildButtonDef(trumbowyg));
                },
                // Return a list of button names which are active on current element
                tagHandler: function (element, trumbowyg) {
                    return [];
                },
                destroy: function (trumbowyg) { }
            }
        }
    });
}

/* ===========================================================
 * trumbowyg.upload.js v1.2
 * Upload plugin for Trumbowyg
 * http://alex-d.github.com/Trumbowyg
 * ===========================================================
 * Author : Alexandre Demode (Alex-D)
 *          Twitter : @AlexandreDemode
 *          Website : alex-d.fr
 * Mod by : Aleksandr-ru
 *          Twitter : @Aleksandr_ru
 *          Website : aleksandr.ru
 */

function loadUploadPlugin() {

    var defaultOptions = {
        serverPath: '',
        fileFieldName: 'fileToUpload',
        data: [],                       // Additional data for ajax [{name: 'key', value: 'value'}]
        headers: {},                    // Additional headers
        xhrFields: {},                  // Additional fields
        urlPropertyName: 'file',        // How to get url from the json response (for instance 'url' for {url: ....})
        statusPropertyName: 'success',  // How to get status from the json response 
        success: undefined,             // Success callback: function (data, trumbowyg, $modal, values) {}
        error: undefined,               // Error callback: function () {}
        imageWidthModalEdit: false      // Add ability to edit image width
    };

    function getDeep(object, propertyParts) {
        var mainProperty = propertyParts.shift(),
            otherProperties = propertyParts;

        if (object !== null) {
            if (otherProperties.length === 0) {
                return object[mainProperty];
            }

            if (typeof object === 'object') {
                return getDeep(object[mainProperty], otherProperties);
            }
        }
        return object;
    }

    addXhrProgressEvent();

    $.extend(true, $.trumbowyg, {
        langs: {
            // jshint camelcase:false
            en: {
                upload: 'Upload',
                file: 'File',
                uploadError: 'Error'
            },
            cs: {
                upload: 'Nahrát obrázek',
                file: 'Soubor',
                uploadError: 'Chyba'
            },
            da: {
                upload: 'Upload',
                file: 'Fil',
                uploadError: 'Fejl'
            },
            de: {
                upload: 'Hochladen',
                file: 'Datei',
                uploadError: 'Fehler'
            },
            fr: {
                upload: 'Envoi',
                file: 'Fichier',
                uploadError: 'Erreur'
            },
            hu: {
                upload: 'Feltöltés',
                file: 'Fájl',
                uploadError: 'Hiba'
            },
            ja: {
                upload: 'アップロード',
                file: 'ファイル',
                uploadError: 'エラー'
            },
            ko: {
                upload: '그림 올리기',
                file: '파일',
                uploadError: '에러'
            },
            pt_br: {
                upload: 'Enviar do local',
                file: 'Arquivo',
                uploadError: 'Erro'
            },
            ru: {
                upload: 'Загрузка',
                file: 'Файл',
                uploadError: 'Ошибка'
            },
            sk: {
                upload: 'Nahrať',
                file: 'Súbor',
                uploadError: 'Chyba'
            },
            tr: {
                upload: 'Yükle',
                file: 'Dosya',
                uploadError: 'Hata'
            },
            zh_cn: {
                upload: '上传',
                file: '文件',
                uploadError: '错误'
            },
            zh_tw: {
                upload: '上傳',
                file: '文件',
                uploadError: '錯誤'
            },
        },
        // jshint camelcase:true

        plugins: {
            upload: {
                init: function (trumbowyg) {
                    trumbowyg.o.plugins.upload = $.extend(true, {}, defaultOptions, trumbowyg.o.plugins.upload || {});
                    var btnDef = {
                        fn: function () {
                            trumbowyg.saveRange();

                            var file,
                                prefix = trumbowyg.o.prefix;

                            var fields = {
                                file: {
                                    type: 'file',
                                    required: true,
                                    attributes: {
                                        accept: 'image/*'
                                    }
                                },
                                alt: {
                                    label: 'description',
                                    value: trumbowyg.getRangeText()
                                }
                            };

                            if (trumbowyg.o.plugins.upload.imageWidthModalEdit) {
                                fields.width = {
                                    value: ''
                                };
                            }

                            var $modal = trumbowyg.openModalInsert(
                                // Title
                                trumbowyg.lang.upload,

                                // Fields
                                fields,

                                // Callback
                                function (values) {
                                    var data = new FormData();
                                    data.append(trumbowyg.o.plugins.upload.fileFieldName, file);

                                    trumbowyg.o.plugins.upload.data.map(function (cur) {
                                        data.append(cur.name, cur.value);
                                    });

                                    $.map(values, function (curr, key) {
                                        if (key !== 'file') {
                                            data.append(key, curr);
                                        }
                                    });

                                    if ($('.' + prefix + 'progress', $modal).length === 0) {
                                        $('.' + prefix + 'modal-title', $modal)
                                            .after(
                                                $('<div/>', {
                                                    'class': prefix + 'progress'
                                                }).append(
                                                    $('<div/>', {
                                                        'class': prefix + 'progress-bar'
                                                    })
                                                )
                                            );
                                    }

                                    $.ajax({
                                        url: trumbowyg.o.plugins.upload.serverPath,
                                        headers: trumbowyg.o.plugins.upload.headers,
                                        xhrFields: trumbowyg.o.plugins.upload.xhrFields,
                                        type: 'POST',
                                        data: data,
                                        cache: false,
                                        dataType: 'json',
                                        processData: false,
                                        contentType: false,

                                        progressUpload: function (e) {
                                            $('.' + prefix + 'progress-bar').css('width', Math.round(e.loaded * 100 / e.total) + '%');
                                        },

                                        success: function (data) {
                                            if (trumbowyg.o.plugins.upload.success) {
                                                trumbowyg.o.plugins.upload.success(data, trumbowyg, $modal, values);
                                            } else {
                                                if (!!getDeep(data, trumbowyg.o.plugins.upload.statusPropertyName.split('.'))) {
                                                    var url = getDeep(data, trumbowyg.o.plugins.upload.urlPropertyName.split('.'));
                                                    trumbowyg.execCmd('insertImage', url, false, true);
                                                    var $img = $('img[src="' + url + '"]:not([alt])', trumbowyg.$box);
                                                    $img.attr('alt', values.alt);
                                                    if (trumbowyg.o.imageWidthModalEdit && parseInt(values.width) > 0) {
                                                        $img.attr({
                                                            width: values.width
                                                        });
                                                    }
                                                    setTimeout(function () {
                                                        trumbowyg.closeModal();
                                                    }, 250);
                                                    trumbowyg.$c.trigger('tbwuploadsuccess', [trumbowyg, data, url]);
                                                } else {
                                                    trumbowyg.addErrorOnModalField(
                                                        $('input[type=file]', $modal),
                                                        trumbowyg.lang[data.message]
                                                    );
                                                    trumbowyg.$c.trigger('tbwuploaderror', [trumbowyg, data]);
                                                }
                                            }
                                        },

                                        error: trumbowyg.o.plugins.upload.error || function () {
                                            trumbowyg.addErrorOnModalField(
                                                $('input[type=file]', $modal),
                                                trumbowyg.lang.uploadError
                                            );
                                            trumbowyg.$c.trigger('tbwuploaderror', [trumbowyg]);
                                        }
                                    });
                                }
                            );

                            $('input[type=file]').on('change', function (e) {
                                try {
                                    // If multiple files allowed, we just get the first.
                                    file = e.target.files[0];
                                } catch (err) {
                                    // In IE8, multiple files not allowed
                                    file = e.target.value;
                                }
                            });
                        }
                    };

                    trumbowyg.addBtnDef('upload', btnDef);
                }
            }
        }
    });

    function addXhrProgressEvent() {
        if (!$.trumbowyg.addedXhrProgressEvent) {   // Avoid adding progress event multiple times
            var originalXhr = $.ajaxSettings.xhr;
            $.ajaxSetup({
                xhr: function () {
                    var that = this,
                        req = originalXhr();

                    if (req && typeof req.upload === 'object' && that.progressUpload !== undefined) {
                        req.upload.addEventListener('progress', function (e) {
                            that.progressUpload(e);
                        }, false);
                    }

                    return req;
                }
            });
            $.trumbowyg.addedXhrProgressEvent = true;
        }
    }
}

/* ===========================================================
 * trumbowyg.flxpasteuploadimage.js v1.0
 * 
 * based ontrumbowyg.pasteimage.js v1.0
 * depends on trumbowyg.upload.js v1.2
 * clipboard image paste and upload plugin for Trumbowyg
 * http://alex-d.github.com/Trumbowyg
 * ===========================================================
 * Modified for upload instead of inline base64 by flexion
 */

function loadFlxPasteImgPlugin() {
    $.extend(true, $.trumbowyg, {
        plugins: {
            pasteImage: {
                init: function (trumbowyg) {
                    if (!trumbowyg.o.plugins.upload) {
                        console.error("flxpasteuploadimage plugin depends on the upload plugin.");
                        return;
                    }
                    console.log("[flxpasteuploadimage] loading");
                    trumbowyg.pasteHandlers.push(function (pasteEvent) {
                        try {
                            var items = (pasteEvent.originalEvent || pasteEvent).clipboardData.items, reader;

                            for (var i = items.length - 1; i >= 0; i += 1) {
                                if (items[i].type.match(/^image\//)) {

                                    var data = new FormData();
                                    data.append(trumbowyg.o.plugins.upload.fileFieldName, items[i].getAsFile());

                                    trumbowyg.o.plugins.upload.data.map(function (cur) {
                                        data.append(cur.name, cur.value);
                                    });

                                    console.log("[flxpasteuploadimage] uploading..");

                                    $.ajax({
                                        url: trumbowyg.o.plugins.upload.serverPath,
                                        headers: trumbowyg.o.plugins.upload.headers,
                                        xhrFields: trumbowyg.o.plugins.upload.xhrFields,
                                        type: 'POST',
                                        data: data,
                                        cache: false,
                                        dataType: 'json',
                                        processData: false,
                                        contentType: false,

                                        progressUpload: function (e) {
                                            //$('.' + prefix + 'progress-bar').css('width', Math.round(e.loaded * 100 / e.total) + '%');
                                        },

                                        success: function (data) {
                                            if (trumbowyg.o.plugins.upload.success) {
                                                console.log("custom success handler not implemented");
                                                //trumbowyg.o.plugins.upload.success(data, trumbowyg, $modal, values);
                                            } else {
                                                if (data.success) {
                                                    var url = data.url; // or use something like trumbowyg.o.plugins.upload.urlPropertyName.split('.')
                                                    var html = '<img src="' + url + '">';
                                                    var node = $(html)[0];
                                                    trumbowyg.range.deleteContents();
                                                    trumbowyg.range.insertNode(node);
                                                } else {
                                                    console.error("error", data.message);
                                                }
                                            }
                                        },

                                        error: trumbowyg.o.plugins.upload.error || function () {
                                            alert(trumbowyg.lang.uploadError);
                                        }
                                    });

                                }
                            }
                        } catch (c) {
                        }
                    });
                }
            }
        }
    });
}
