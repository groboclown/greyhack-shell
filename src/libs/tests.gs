// Unit Test Tooling
//
// Two modes of running.
//
// This supports the Mocha style:
//
//     T.Describe("when a number is 2", function()
//        T.Test("it is 2", function(t)
//          t.Expect(2).ToBe(2)
//        end function)
//     end function)
//
// All assertion and check functions return "true" on failures,
// so that the code for early exit on required checks are
// easier to write:
//
//     if t.AssertTrue(false) then return

//#require errors.gs

T = {}
T.depth = 0
T.errors = []

// T.T The Test Case holder.
T.T = {}
T.T.New = function(errorLogger, name)
    ret = new T.T
    ret.name = name
    ret.errors = []
    ret.logger = @errorLogger
    ret.depth = T.depth
    return ret
end function

// T.T.SubTest Run a function as a sub-test.  Returns true if it fails.
T.T.SubTest = function(name, testFunc)
    subErrs = T.RunTest(testFunc, name, self.depth + 1)
    self.errors = self.errors + subErrs
    return subErrs.len > 0
end function


// T.T.Fail Reports a failure
T.T.Fail = function(text=null, extra=null)
    if text == null then
        text = "failure"
    end if
    err = { "test": self.name, "failure": text }
    if extra != null then
        err = err + extra
    end if
    if globals.hasIndex("ErrorLib") then
        e = ErrorLib.Error.New(ErrorLib.Message.New(text, err))
        self.errors.push(e)
        msg = e.Text
    else
        msg = text
    end if
    self.errors.push(err)
    self.logger(msg)
    return true
end function

// T.T.AssertTrue Reports a failure if the first argument is not true
T.T.AssertTrue = function(value, text=null)
    if value != true then
        self.Fail(text, {"value": value})
        return true
    end if
    return false
end function

// T.T.AssertFalse
T.T.AssertFalse = function(value, text=null)
    if value != false then
        return self.Fail(text, {"value": value})
    end if
    return false
end function

T.T._text = function(text)
    if text != null then
        t = str(text)
        if t.len > 0 then return "; " + t
    end if
    return ""
end function

// T.T.AssertEqual
T.T.AssertEqual = function(expected, actual, text=null)
    if actual != expected then
        return self.Fail("expected [{expected}], found [{actual}]{text}", {"expected": expected, "actual": actual, "text": self._text(text)})
    end if
    return false
end function

// T.T.AssertEqualAny
T.T.AssertEqualAny = function(expectedList, actual, text=null)
    for expected in expectedList
        if actual == expected then
            return false
        end if
    end for
    return self.Fail("expected one of {expected}, found [{actual}]{text}", {"expected": expectedList, "actual": actual, "text": self._text(text)})
end function

// T.T.AssertNotEqual
T.T.AssertNotEqual = function(expected, actual, text=null)
    if actual == expected then
        self.Fail("found {expected}{text}", {"expected": expected, "actual": actual, "text": self._text(text)})
        return true
    end if
    return false
end function

// T.T.AssertNull
T.T.AssertNull = function(actual, text=null)
    if actual != null then
        self.Fail("expected null, found [{actual}]{text}", {"expected": null, "actual": actual, "text": self._text(text)})
        return true
    end if
    return false
end function

// T.T.AssertNotNull
T.T.AssertNotNull = function(actual, text=null)
    if actual == null then
        self.Fail("expected a non-null value{text}", {"actual": actual, "text": self._text(text)})
        return true
    end if
    return false
end function

// T.T.AssertDeepEqual
T.T.AssertDeepEqual = function(expected, actual, text=null)
    seen = []
    hasSeen = function(val)
        for v in seen
            if v == val then return true
        end for
        return false
    end function

    deepUnequal = function(e1, a1)
        // quick checks
        if @e1 == null and @a1 == null then return false
        if @e1 == null and @a1 != null then return true
        if @e1 != null and @a1 == null then return true

        // Get simple type checks out of the way.
        if @e1 isa funcRef then return not (@a1 isa funcRef and @a1 == @e1)
        if @a1 isa funcRef then return true
        // function references are finished, so we don't need @ anymore.
        if e1 isa string then return not (a1 isa string and e1 == a1)
        if a1 isa string then return true
        if e1 isa number then return not (a1 isa number and (e1 - a1 < 0.0001) and (e1 - a1 > -0.0001))
        if a1 isa number then return true

        // If it's been seen
        if hasSeen(e1) then return false

        if e1 isa map then
            if not a1 isa map then return true
            if e1.len != a1.len then return true
            seen.push(e1)

            // Because they have the same key count, we know that looping
            // over all the keys in one will be checking that the other doesn't
            // have more keys.
            for k in e1.indexes
                if not a1.hasIndex(k) then return true
                // skip the class checks.
                if k == "__isa" then continue
                if deepUnequal(e1[k], a1[k]) then return true
            end for
            // All the keys and their values match up.
            return false
        end if
        if e1 isa list then
            if not a1 isa list then return true
            if e1.len != a1.len then return true
            seen.push(e1)

            for idx in e1.indexes
                if deepUnequal(e1[idx], a1[idx]) then return true
            end for
            // All the indexes are equal, so they are equal.
            return false
        end if

        // Else it's a simple type, and they are !=, so ... they are unequal.
        return false
    end function

    if deepUnequal(expected, actual) then
        return self.Fail("expected {expected}, found {actual}{text}", {"expected": expected, "actual": actual, "text": self._text(text)})
    end if
    return false
end function

T.T.Expect = function(value)
    ret = new T.ex
    ret.value = value
    ret.asTrue = true
    ret.t = self
    return ret
end function

T.ex = {}

T.ex.ToBe = function(value, text=null)
    if self.asTrue then
        return self.t.AssertEqual(self.value, value, text)
    else
        return self.t.AssertNotEqual(self.value, value, text)
    end if
end function

T.ex.Not = function()
    self.asTrue = not self.asTrue
end function


// T.Describe A test context.
T.Describe = function(text, f)
    initial_depth = T.depth
    T.depth = T.depth + 1

    T.Logger.DescribeEnd(initial_depth, text)
    f()
    T.Logger.DescribeEnd(initial_depth, text)

    T.depth = initial_depth
end function

// T.Test A test execution context.
T.Test = function(text, f)
    initial_depth = T.depth

    T.depth = T.depth + 1

    T.Logger.TestStart(initial_depth, text)
    errFunc = function(err)
        T.Logger.Error(initial_depth, err)
    end function
    t = T.T.New(@errFunc, text)
    f(t)
    T.Logger.TestEnd(initial_depth, text, t.errors.len <= 0)

    T.errors = T.errors + t.errors
    T.depth = initial_depth
end function

// T.ConsoleLogger a logger that reports test execution state to the console.
T.ConsoleLogger = {}
T.ConsoleLogger.New = function()
    ret = new T.ConsoleLogger
    return ret
end function

T.ConsoleLogger.DescribeStart = function(depth, name)
    print "<color=#808080>" + self.GetIndent(depth) + name + " ...</color>"
end function

T.ConsoleLogger.DescribeEnd = function(depth, name)
end function

T.ConsoleLogger.TestStart = function(depth, name)
    print "<color=#00ffff>" + self.GetIndent(depth) + name + " ...</color>"
end function

T.ConsoleLogger.Error = function(depth, err)
    text = "(unknown error)"
    if err == null then
        text = "(null)"
    if err != null and err isa map and err.hasIndex("Text") then
        text = str(err.Text)
    else
        text = str(err)
    end if
    print self.GetIndent(depth + 1) + "<color=#800000>Fail</color> - " + text + "</color>"
end function

T.ConsoleLogger.TestEnd = function(depth, name, pass)
    indent = self.GetIndent(depth)
    if pass then
        print "<color=#00a0a0>" + indent + name + " ... <color=#00ff00>OK!</color>"
    else
        print "<color=#00a0a0>" + indent + name + " ... <color=#ff3030>Failed</color>"
    end if
end function

T.ConsoleLogger.GetIndent = function(depth)
    indent = ""
    for _ in range(0, depth)
        indent = indent + "  "
    end for
    return indent
end function

// T.Logger A Logger instance.
T.Logger = T.ConsoleLogger.New()

// RunTests Run all the tests in the global namespace.
T.RunTests = function(space=null)
    print("<color #ffff00>=================================================================</color>")
    print("<color #ffff00>Starting Test Execution</color>")
    if space == null then
        space = globals
    end if
    total = 0
    errors = 0
    for name in space.indexes
        if name[:4] == "Test" and @space[name] isa funcRef then
            total = total + 1
            res = T.RunTest(@space[name], name)
            errors = errors + res
        end if
    end for
    if total == 0 then
        T.Logger.Error(0, "No tests")
        errors = errors + 1
    end if
    return errors
end function

// RunTest Run a test function, passed as an argument
T.RunTest = function(testFunc, name=null, depth=0)
    if name == null then
        if @testFunc isa string then
            name = testFunc
            testFunc = @globals[name]
        else
            name = "test"
        end if
    end if
    errLogger = function(err)
        T.Logger.Error(depth, err)
    end function
    t = T.T.New(@errLogger, name)
    if @testFunc isa funcRef then
        T.Logger.TestStart(depth, name)
        testFunc(t)
        T.Logger.TestEnd(depth, name, t.errors.len <= 0)
    else
        t.Fail("Test is not a function")
    end if
    return t.errors
end function
