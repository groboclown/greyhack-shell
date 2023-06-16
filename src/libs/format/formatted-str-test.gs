// Test string formatting.

import_code("../errors.gs")
import_code("../tests.gs")
import_code("formatted-str.gs")

    
TestPyFormat_no_format = function(t)
    t.Expect(FormatStr.PyFormat("1 2 3", {"1": "x"})).ToBe("1 2 3")
end function

TestPyFormat_single_replacement = function(t)
    t.Expect(FormatStr.PyFormat("{x}", {"x": "abc", "y": 2})).ToBe("abc")
end function

TestPyFormat_deep = function(t)
    t.Expect(FormatStr.PyFormat("{val}", {"val": [{"a": 1}, {"b": 2}]})).ToBe("#1:[#2:{a: 1}, #3:{b: 2}]")
end function

if locals == globals then T.RunTests
