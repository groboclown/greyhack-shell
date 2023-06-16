// Unit test for the sorting algorithm.

import_code("sort.gs")
import_code("../errors.gs")
import_code("../tests.gs")

TestQuickSort_empty = function(t)
    val = []
    StdLib.QuickSort(val, @StdLib.NumberAscOrder)
    t.AssertDeepEqual([], val)
end function

TestQuickSort_one = function(t)
    val = [1]
    StdLib.QuickSort(val, @StdLib.NumberAscOrder)
    t.AssertDeepEqual([1], val)
end function

TestQuickSort_twoOrdered = function(t)
    val = [1, 2]
    StdLib.QuickSort(val, @StdLib.NumberAscOrder)
    t.AssertDeepEqual([1, 2], val)
end function

TestQuickSort_twoReverse = function(t)
    val = [2, 1]
    StdLib.QuickSort(val, @StdLib.NumberAscOrder)
    t.AssertDeepEqual([1, 2], val)
end function

TestQuickSort_manyReverse = function(t)
    val = [30, 20, 10, 0, -10, -20]
    StdLib.QuickSort(val, @StdLib.NumberAscOrder)
    t.AssertDeepEqual([-20, -10, 0, 10, 20, 30], val)
end function

TestQuickSort_twoStrings = function(t)
    val = ["zebra", "aardvark"]
    StdLib.QuickSort(val, @StdLib.StringAscOrder)
    t.AssertDeepEqual(["aardvark", "zebra"], val)
end function

if locals == globals then T.RunTests
