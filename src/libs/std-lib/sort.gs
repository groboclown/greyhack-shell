// Quick Sort Algorithm.

if not globals.hasIndex("StdLib") then globals.StdLib = {}
StdLib = globals.StdLib


// StdLib.QuickSort() Sort the first argument as a list in place, using the second argument as a comparator.
//
// The comparator must return 0 if they are equal, < 0 if the first shows up earlier,
// or > 0 if the first shows up later.
// So, for an ascending order list of integers, you can use:
// function ascendingInt(a, b)
//   return a - b
// end function
StdLib.QuickSort = function(list, comparison)
    return StdLib.QuickSort__entry(list, @comparison, 0, list.len - 1)
end function

StdLib.QuickSort__entry = function(list, comparison, lo, hi)
    if lo >= 0 and hi >= 0 and lo < hi then
        p = StdLib.QuickSort__partition(list, @comparison, lo, hi)
        StdLib.QuickSort__entry(list, @comparison, lo, p)
        StdLib.QuickSort__entry(list, @comparison, p + 1, hi)
    end if
end function

StdLib.QuickSort__partition = function(list, comparison, lo, hi)
    pivot = list[floor((hi - lo) / 2) + lo]
    i = lo - 1
    j = hi + 1
    while true
        i = i + 1
        while comparison(list[i], pivot) < 0
            i = i + 1
        end while
        j = j - 1
        while comparison(list[j], pivot) > 0
            j = j - 1
        end while
        if i >= j then return j
        tmp = list[i]
        list[i] = list[j]
        list[j] = tmp
    end while
end function


StdLib.NumberAscOrder = function(a, b)
    return a - b
end function

StdLib.NumberDescOrder = function(a, b)
    return b - a
end function

StdLib.StringAscOrder = function(a, b)
    if a == b then return 0
    if a < b then return -1
    return 1
end function
