/**
 * Created by Antonio on 10/06/2016.
 *
 */

function React() {
    // React is singleton
    if ("__react_engine" in window)
        return window.__react_engine;

    window.__react_engine = this;
    this.handlers = {};
    this.next_id = 0;

    this.createClass = function(comp) {
        comp.constructor();
        comp.last_vdom = { type: -1 };
        comp.dom_root = document;
        comp.comp_ID = this.next_id;

        this.next_id += 1;
        this.handlers[comp.comp_ID] = {};

        comp.fast_render = function(){
            comp.last_vdom = comp.render();
            return comp.last_vdom;
        };

        return comp;
    };

    this.remove_component = function(comp) {
        delete this.handlers[comp.comp_ID];
        comp.dom_root.innerHTML = "";
    };

    this.create_handler = function(obj, handler_name) {
        if (handler_name in this.handlers[obj.comp_ID])
            return "__react_engine.handlers[" + obj.comp_ID + "]." + handler_name + "()";
        var f = function(event) {
            var R = window.__react_engine;
            obj[handler_name](event);
            R.render(obj, obj.dom_root);
        };
        this.handlers[obj.comp_ID][handler_name] = f; //f.bind(obj);
        return "__react_engine.handlers[" + obj.comp_ID + "]." + handler_name + "()";
    };

    this.render = function(component, DOM) {
        component.dom_root = DOM;
        var vdom = component.render();
        shtml = this.parseVDOM(vdom);
        console.log("component: " + shtml);
        DOM.innerHTML = shtml;
    };

    this.fast_render = function(component, DOM) {
        var last_dom = component.last_vdom;
        var curr_dom = component.fast_render();
        component.dom_root = DOM;
        console.log("fast rendering.");
        this.render_node(last_dom, curr_dom, DOM);
    };

    this.render_node = function(last_dom, curr_dom, DOM) {
        var tl = this.vdomType(last_dom);
        var tc = this.vdomType(curr_dom);
        if (tl != tc) {
            // Different DOM types
            DOM.innerHTML = this.parseVDOM(curr_dom);
            return;
        }
        if (tc == this.VDOMType.Node) {
            // check tag
            if (last_dom.tag != curr_dom.tag) {
                DOM.innerHTML = this.parseVDOM(curr_dom);
                return;
            }

            DOM = DOM.firstChild;
            // check attributes
            for (var k in last_dom.attributes) {
                if (!(k in attrs))
                    DOM.attributes.removeNamedItem(k);
            }
            for (var k in curr_dom.attrs) {
                if (curr_dom[k] != last_dom[k]) {
                    var x = document.createAttribute(k);
                    x.value = curr_dom[k];
                    DOM.attributes.setNamedItem(x);
                }
            }

            //check children
            this.render_node(last_dom.children, curr_dom.children, DOM);

        } else if (tc == this.VDOMType.Array) {
            // modify children
            var i = 0;
            while(DOM.firstChild) {
                child = DOM.firstChild;
                if (i < curr_dom.length && i < last_dom.length) {
                    this.render_node(last_dom[i], curr_dom[i], child);
                    i++;
                } else {
                    DOM.removeChild(child);
                }
            }
            // add new children
            for(i=DOM.children.length; i<curr_dom.length; i++) {
                var shtml = this.parseVDOM(curr_dom[i]);
                var node = document.createElement("p");
                DOM.appendChild(node);
                node.outerHTML = shtml;
            }
        } else {
            // string match
            if (curr_dom != last_dom)
                DOM.innerHTML = curr_dom;
        }
    };

    this.VDOMType = {
        Node: 0,
        Array: 1,
        Text: 2
    };

    this.vdomType = function(vdom) {
        //console.log(vdom)
        if (!vdom.hasOwnProperty("type")) {
            if (Array.isArray(vdom)) {
                vdom["type"] = this.VDOMType.Array;
            } else if (vdom.hasOwnProperty("tag")) {
                vdom["type"] = this.VDOMType.Node;
            } else {
                vdom["type"] = this.VDOMType.Text;
            }
        }
        return vdom["type"];
    };

    this.parseVDOM = function(vdom) {
        var shtml = "";
        var type = this.vdomType(vdom);
        // Node array
        if (type == this.VDOMType.Array) {
            for (var i = 0; i < vdom.length; i++) {
                shtml += this.parseVDOM(vdom[i]);
            }
        }
        else if (type == this.VDOMType.Node) {
            //Node
            var sattr = "";
            if ("attrs" in vdom) {
                for (var key in vdom.attrs)
                    sattr += key + "=" + vdom.attrs[key] + " ";
            }
            var openTag = "<" + vdom.tag + " " + sattr + ">";
            var closeTag = "</ " + vdom.tag + ">";

            shtml += openTag;
            if (vdom.hasOwnProperty("children"))
                shtml += this.parseVDOM(vdom.children);
            shtml += closeTag;
        } else {
            shtml += vdom.toString();
        }
        return shtml;
    };
}

var R = new React();

var counter = R.createClass({
    constructor: function() { this.count = 0; },
    onClick: function(event) { this.count += 1; },
    render: function() {
        return [ { tag: 'span', children: this.count },
                 { tag: 'button', attrs: { onClick: R.create_handler(this, "onClick") },
                     children: 'Increment' } ]
    }
});

console.log("rendering");

function f() {
    R.fast_render(counter, document.getElementById("demo"));
}