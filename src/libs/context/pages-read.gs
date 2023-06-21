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
    if context != null and page != null and context isa map and page isa string and context.hasIndex("Pages") and context.Pages.hasIndex(page) then
        src = context.Pages[page]
        if start == null then
            start = 0
        else
            if not start isa number then return []
            if start < 0 then return []
        end if
        if count == null then
            tail = src.len
        else
            if not count isa number then return []
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
        if start >= tail then return []

        pos = start
        ret = []
        while pos < tail
            ret.push(src[pos])
            pos = pos + 1
        end while
        return ret
    end if
    return []
end function

// TailPage() Fetches a copy of the page from the context, starting from the end..
//
// If the page does not exist, an empty list is returned.
// The stored page remains unchanged.
ContextLib.TailPage = function(context, page, tail=null, count=null)
    if context != null and page != null and context isa map and page isa string and context.hasIndex("Pages") and context.Pages.hasIndex(page) then
        src = context.Pages[page]
        total = src.len
        if tail == null then
            tail = 0
        else
            if not tail isa number then return []
            if tail < 0 then return []
        end if
        if count == null then
            head = 0
            count = total - tail
        else if count isa number and count >= 0 then
            head = total - tail - count
            if head < 0 then head = 0
            if head >= total then return []
        else
            return []
        end if
        if head + count > total then count = total - head

        idx = 0
        ret = []
        while idx < count
            ret.push(src[head + idx])
            idx = idx + 1
        end while
        return ret
    end if
    return []
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
