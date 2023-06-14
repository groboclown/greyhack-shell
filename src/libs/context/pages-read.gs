// Functionality to read from the pages.
// A "null" page is turned into checking for the default page ("")

if not globals.hasIndex("ContextLib") then globals.ContextLib = {}
ContextLib = globals.ContextLib

// HasPage() does the page exist in the context?
ContextLib.HasPage = function(context, page)
    return context != null and page != null and context isa map and page isa string and context.hasIndex("Pages") and context.Pages.hasIndex(page)
end function

// Page() Fetches a copy of the page from the context.
//
// If the page does not exist, an empty list is returned.
// The stored page remains unchanged.
//
// If a "start" is given, then all rows starting with that index are
// returned.  If "count" is given, then only that number of rows
// (up to the number of available rows including and after the start row)
// are returned.
ContextLib.Page = function(context, page, start=null, count=null)
    page_range = ContextLib._page_range(context, page, start, count)
    if page_range == null then return []
    src = page_range[0]
    pos = page_range[1]
    tail = page_range[2]
    ret = []
    while pos < tail
        ret.push(src[pos])
        pos = pos + 1
    end while
    return ret
end function

// NextPageRow() Retrieves the first row of the given page, and removes it from that page.
//
// If the page does not exist, or if it has no more rows, then this returns null.
ContextLib.NextPageRow = function(context, page)
    ret = null
    if page == null then page = ""
    if context != null and page != null and context isa map and page isa string and context.hasIndex("Pages") and context.Pages.hasIndex(page) then
        src = context.Pages[page]
        if src.len > 0 then
            ret = src[0]
            src.remove(0)
        end if
    end if
    return ret
end function

// ClearPage() Removes the rows from a page, and returns the number of removed rows.
//
// If the page does not exist, this returns 0.
//
// If a "start" is given, then all rows starting with that index are
// removed.  If "count" is given, then only that number of rows
// (up to the number of available rows including and after the start row)
// are removed.
ContextLib.ClearPage = function(context, page, start=null, count=null)
    page_range = ContextLib._page_range(context, page, start, count)
    if page_range == null then return 0
    src = page_range[0]
    start = page_range[1]
    tail = page_range[2]
    page = page_range[3]
    res = []
    count = 0
    if start > 0 then
        if tail < src.len then
            res = src[0:start] + src[tail:]
            count = tail - start
        else
            res = src[0:start]
            count = src.len - start
        end if
    else if tail < src.len then
        res = src[tail:]
        count = tail
        // else final page result is empty
    end if
    context.Pages[page] = res
    return count
end function

// private function - _page_range returns the page's rows, the start index, end index, page name
// or null if there was a problem.
ContextLib._page_range = function(context, page, start, count)
    if context != null and page != null and context isa map and page isa string and context.hasIndex("Pages") and context.Pages.hasIndex(page) then
        src = context.Pages[page]
        if start == null then
            start = 0
        else
            if not start isa number then return null
            if start < 0 then return null
        end if
        if count == null then
            tail = src.len
        else
            if not count isa number then return null
            // To return all rows, use count == null.
            if count < 0 then
                tail = src.len - count
            else
                tail = start + count
            end if
            if tail > src.len then
                tail = src.len
            end if
        end if
        if start >= tail then return null
        return [src, start, tail, page]
    end if
    return null
end function
