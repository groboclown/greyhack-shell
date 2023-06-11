// Pulled from:
//   https://github.com/JoeStrout/miniscript/blob/master/MiniScript-cpp/lib/json.ms
// Under the MIT License.
// Modified to be in the "FileLib" namespace.

import_code("../errors.gs")
import_code("../tests.gs")
import_code("json.gs")


TestJsonParser_init = function(t)
	p = new FileLib.Json.Parser
	p.init("  true ")
	t.AssertEqual(p.parse, 1)
end function

TestJsonParse_numbers = function(t)
	t.AssertEqual(FileLib.Json.parse(char(13) + "42"), 42)
	t.AssertEqual(FileLib.Json.parse("-123.45"), -123.45)
	t.AssertEqual(FileLib.Json.parse(".5"), 0.5)
	t.AssertEqual(FileLib.Json.parse("-.25"), -0.25)
end function

//TestJsonParse_strings = function(t)
//	t.AssertEqual(FileLib.Json.parse("""\tHello, \""Bob\""."""), char(9) + "Hello, ""Bob"".")
//	t.AssertEqual(FileLib.Json.parse("""\u002F"""), "/"
//end function
//
//TestJsonParse_lists = function(t)
//	t.AssertEqual(FileLib.Json.parse("[1, 2 , 3]"), [1, 2, 3])
//	t.AssertEqual(FileLib.Json.parse("[ ""hey"", true, [0]]"), ["hey", true, [0]])
//end function
//
//TestJsonParse_maps = function(t)
//	t.AssertEqual(FileLib.Json.parse("{""hey"": ""ho"", ""9"" : 81}"), {"hey":"ho", "9":81})
//end function
//
//TestJsonParse_complex = function(t)
//	// And here's a longer example... remember, quotes doubled only
//	// to make them valid MiniScript string literals...
//	data = parse("{""widget"": {" +
//	"    ""debug"": ""on""," +
//	"    ""window"": {" +
//	"        ""title"": ""Sample Konfabulator Widget""," +
//	"        ""name"": ""main_window""," +
//	"        ""visible"": false," +
//	"        ""width"": 500," +
//	"        ""height"": 300," +
//	"        ""left"": -123.456," +
//	"        ""top"": 234.567," +
//	"    }," +
//	"    ""image"": { " +
//	"        ""src"": ""Images\\Sun.png""," +
//	"        ""name"": ""sun1""," +
//	"        ""hOffset"": 250," +
//	"        ""vOffset"": 250," +
//	"        ""alignment"": ""center""" +
//	"    }," +
//	"    ""text"": {" +
//	"        ""data"": ""Click Here""," +
//	"        ""size"": 36," +
//	"        ""style"": ""bold""," +
//	"        ""name"": ""text1""," +
//	"        ""hOffset"": 250," +
//	"        ""vOffset"": 100," +
//	"        ""alignment"": ""center""," +
//	"        ""onMouseUp"": ""sun1.opacity = (sun1.opacity / 100) * 90;""" +
//	"    }}}")
//	t.AssertEqual data.widget.debug, "on"
//	t.AssertEqual data.widget.window.width, 500
//	t.AssertEqual data.widget.image.src, "Images\Sun.png"
//	t.AssertEqual data.widget.text.size, 36
//end function
//
//TestJson_toJSON = function(t)
//	t.AssertEqual toJSON(42), "42"
//	t.AssertEqual toJSON(char(9)), """\t"""
//	t.AssertEqual toJSON([1, 2, 3], true), "[1,2,3]"
//	// Maps are a bit tricky to unit-test, since the order in which the keys appear
//	// is undefined.  But here we go:
//	t.AssertEqualAny toJSON({"one":1, "two":2}, true), 
//		["{""one"":1,""two"":2}", "{""two"":2,""one"":1}"]
//
//end function

if locals == globals then T.RunTests
