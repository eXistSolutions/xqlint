exports.Translator = function(rootStcx, ast){
    'use strict';

    var StaticError = require('./staticError').StaticError;
    var StaticContext = require('./StaticContext').StaticContext;
    
    var markers = [];
    var apply = function(fn) {
        try {
            fn();
        } catch(e) {
            if(e instanceof StaticError) {
                addStaticError(e);
            } else {
                throw e;
            }
        }
    };
    var addStaticError = function(e){
        markers.push({
            pos: e.getLoc(),
            type: 'error',
            level: 'error',
            message: '[' + e.getCode() + '] ' + e.getMessage()
        });
    };
    this.getMarkers = function(){
        return markers;
    };

    rootStcx = rootStcx ? rootStcx : new StaticContext();

    var getNodeValue = function(node) {
        var value = '';
        if (node.value === undefined) {
            for (var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                value += getNodeValue(child);
            }
        } else {
            value += node.value;
        }
        return value;
    };
    
    this.ModuleImport = function (node) {
        var ModuleImportHandler = function () {
            var prefix = '';
            var moduleURI;
            //var locationHints = [];

            this.NCName = function (ncname) {
                prefix = getNodeValue(ncname);
            };

            this.URILiteral = function (uri) {
                if(moduleURI) {
                    //location hints
                    return;
                }
                uri = getNodeValue(uri);
                uri = uri.substring(1, uri.length - 1);
                moduleURI = uri;
                apply(function(){
                    rootStcx.addNamespace(uri, prefix, node.loc, 'module');
                });
            };
        };
        this.visitChildren(node, new ModuleImportHandler());
        return true;
    };
    
    this.SchemaImport = function (node) {
        var that = this;
        var SchemaImportHandler = function () {
            var prefix = '';
            var schemaURI;
            //var locationHints = [];

            this.SchemaPrefix = function (schemaPrefix) {
                var SchemaPrefixHandler = function () {
                    this.NCName = function (ncname) {
                        prefix = getNodeValue(ncname);
                    };
                };
                that.visitChildren(schemaPrefix, new SchemaPrefixHandler());
            };

            this.URILiteral = function (uri) {
                if(schemaURI) {
                    //location hints
                    return;
                }
                uri = getNodeValue(uri);
                uri = uri.substring(1, uri.length - 1);
                schemaURI = uri;
                apply(function(){
                    rootStcx.addNamespace(uri, prefix, node.loc, 'schema');
                });
            };
        };
        this.visitChildren(node, new SchemaImportHandler());
        return true;
    };
    
    this.visit = function (node) {
        var name = node.name;
        var skip = false;

        if (typeof this[name] === 'function') {
            skip = this[name](node) === true;
        }

        if (!skip) {
            this.visitChildren(node);
        }
    };

    this.visitChildren = function (node, handler) {
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            if (handler !== undefined && typeof handler[child.name] === 'function') {
                handler[child.name](child);
            } else {
                this.visit(child);
            }
        }
    };

    this.visit(ast);
};