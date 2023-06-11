// Unit tests for star-glob

import_code("../errors.gs")
import_code("../tests.gs")
import_code("star-glob.gs")


TestMatchStarPattern = function(t)
    t.AssertTrue FileLib.Glob.MatchStarPattern("tuna", "*")
    t.AssertTrue FileLib.Glob.MatchStarPattern("tuna", "tuna")
    t.AssertFalse FileLib.Glob.MatchStarPattern("tuna", "sushi")
end function

if locals == globals then T.RunTests
