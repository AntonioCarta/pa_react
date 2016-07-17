/**
 * Created by Antonio on 20/06/2016.
 */
var TokenType = {
    Ide: 0,
    String: 1,
    Symbol: 2,
    JSexpr: 3,
    EOF: 4
};

function Lexer(s) {
    this.buffer = s;
    this.i = 0;

    this.isAlphaNumeric = function(str) {
        var code, i, len;

        for (i = 0, len = str.length; i < len; i++) {
            code = str.charCodeAt(i);
            if (!(code > 47 && code < 58) && // numeric (0-9)
                !(code > 64 && code < 91) && // upper alpha (A-Z)
                !(code > 96 && code < 123)) { // lower alpha (a-z)
                return false;
            }
        }
        return true;
    };

    this.next_token = function() {
        var blanks = {' ': 0, '\t': 0, '\n': 0};
        // eliminate blank
        while(this.i < this.buffer.length && this.buffer[this.i] in blanks)
            this.i += 1;

        if (this.i >= this.buffer.length) {
            // End of string reached
            this.curr_token = { type: TokenType.EOF };
            return this.curr_token;
        }

        var c = this.buffer[this.i];
        var s = "";
        // parse Ide
        while (this.i < this.buffer.length && this.isAlphaNumeric(c)) {
            s += c;
            this.i += 1;
            c = this.buffer[this.i];
        }
        if (s != "") {
            this.curr_token = {type: TokenType.Ide, value: s};
        }
        else if (c == '"') {
            // parse String
            s = "";
            this.i += 1;
            c = this.buffer[this.i];
            while (c != '"' && this.i < this.buffer.length) {
                s += c;
                this.i += 1;
                c = this.buffer[this.i];
            }
            if (this.buffer[this.i] != '"')
                throw "Error at position " + this.i + ": " + "expected \"";
            this.i += 1;
            this.curr_token = {type: TokenType.String, value: s};
        } else if (c == '{') {
            // parse JS expression
            s = "{";
            this.i += 1;
            c = this.buffer[this.i];
            while (c != '}' && this.i < this.buffer.length) {
                s += c;
                this.i += 1;
                c = this.buffer[this.i];
            }
            if (this.buffer[this.i] != '}')
                throw "Error at position " + this.i + ": " + "expected }";
            this.i += 1;
            this.curr_token = {type: TokenType.JSexpr, value: s + "}"};
        } else {
            // parse Symbol
            this.i += 1;
            this.curr_token = {type: TokenType.Symbol, value: c};
        }
        return this.curr_token;
    };

    this.lookahead = function(n) {
        var i_saved = this.i;
        var curr_token_saved = this.curr_token;

        var la;
        for(var i=0; i<n; i++)
            la= this.next_token();

        this.i = i_saved;
        this.curr_token = curr_token_saved;
        return la;
    };

    this.match_type = function(type) {
        if (this.curr_token.type != type) {
            throw "Error at position " + this.i + ": " + "expected " + type;
        }
        return this.next_token();
    };

    this.match_symbol = function(symbol) {
        if (this.curr_token.type != TokenType.Symbol || this.curr_token.value != symbol) {
            throw "Error at position " + this.i + ": " + "expected " + symbol;
        }
        return this.next_token();
    };

    this.curr_token = this.next_token();
}

function Parser(s, component) {
    this.lexer = new Lexer(s);
    this.component = component;

    this.parse = function() {
        return this.jsxel()
    };

    this.jsxel = function() {
        // jsxval
        if (this.lexer.curr_token.value != '<')
            return this.jsxval();

        // <tag />
        if (this.lexer.lookahead(2).value == '/') {
            this.lexer.match_symbol('<');
            var tag_name = this.lexer.curr_token.value;
            this.lexer.match_type(TokenType.Ide);
            this.lexer.match_symbol('/');
            this.lexer.match_symbol('>');
            return { tag: tag_name };
        }

        // tagOpen jsxel* tagClose
        var tag_open = this.tagOpen();
        var js_subex = [];
        while (this.lexer.curr_token.value != '<' ||
                this.lexer.lookahead(1).value != '/') {
            js_subex.push(this.jsxel());
        }
        var tag_close = this.tagClose();

        return { tag: tag_open.tag, attrs: tag_open.attrs, children: js_subex };
    };

    this.tagOpen = function() {
        this.lexer.match_symbol('<'); // <
        var tag_name = this.lexer.curr_token.value;
        // [name=jsxval]*
        var attrs = {};
        this.lexer.next_token();
        while(this.lexer.curr_token.type == TokenType.Ide) {
            var name = this.lexer.curr_token.value;
            this.lexer.next_token();
            this.lexer.match_symbol('=');
            var value = this.jsxval();
            attrs[name] = value;
        }
        this.lexer.match_symbol('>');
        return {tag: tag_name, attrs: attrs};
    };

    this.tagClose = function() {
        this.lexer.match_symbol('<');
        this.lexer.match_symbol('/');
        this.lexer.match_type(TokenType.Ide);
        this.lexer.match_symbol('>');
        return {};
    };

    this.jsxval = function() {
        // String
        if (this.lexer.curr_token.type == TokenType.String) {
            var s_val = this.lexer.curr_token.value;
            this.lexer.next_token();
            return s_val;
        }
        // JS expr
        else if (this.lexer.curr_token.type == TokenType.JSexpr) {
            var js_expr = this.lexer.curr_token.value;
            this.lexer.next_token();

            function f() {
                return eval(js_expr);
            }
            return (f.bind(this.component))();
        }
        else
            throw "Syntax Error. Expected value at position " + this.lexer.i;
    }
}

var jsx0 = '<tag1 at1="val1" at2= {this.x = 10}></tag1>';
var jsx1 = '<tag1> <tag2>"just some text"</tag2> </tag1>';
var jsx2 = '<child />';
var jsx_all = '<tag1 at1="val1" at2= {this.x = 10}>  <tag2>"just some text"</tag2> <child /> </tag1>';
var jsx_madotto= '<span><span test= "sdas" asdsa={}><p /> <p>"ahs"</p></span></span><span test= "sdas" asdsa={dsa}>"dasda"</span>';

var comp = {x:1};
var parser = new Parser(jsx_madotto, comp);
var lexer = new Lexer(jsx_all);

var tokens = [];

var x = lexer.curr_token;
while (x.type != TokenType.EOF) {
    console.log("pos: " + lexer.i + ", tok: ");
    console.log(x);
    x = lexer.next_token();
    tokens.push(x);
}

var obj = parser.parse();