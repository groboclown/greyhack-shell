
# Notes:

`print()` command has formatting that's supported a bit by [this](http://digitalnativestudios.com/textmeshpro/docs/rich-text/)

Supported character codes in the fonts:

// 161 - upsidedown !
// 162 - cent sign
// 163 - pound sign
// 164 - currency sign
// 165 - yen
// 166 - broken vertical pipe
// 167 - sign
// 168 - umlaut
// 169 - copyright
// 170 - superscript a
// 171 - <<
// 172 - logical not
// 174 - restricted TM
// 175 - high bar / long mark
// 176 - circle diadectic
// 177 - +/-
// 178 - squared
// 179 - cubed
// 180 - back tick diadectic
// 181 - mu
// 182 - paragraph
// 183 - small center dot
// 184 - cillia
// 185 - superscript 1
// 186 - degree
// 187 - >>
// 188 - 1/4
// 189 - 1/2
// 190 - 3/4
// 191 - upsidedown ?
// 192-255 - accented characters
// 247 - division
// 215 - multiplication
// 286-287 - accent g
// 304 - I accent
// 305 - digamma
// 350-351 - S accent.
// 1024-1279 - cyralic
// 1154 - kind of unequal
// 3585-3675 - arabic?
// 8208,8210-8213 - -
// 8214 - ||
// 8215 - low _
// 8216 - nice left single quote
// 8217 - nice right single quote
// 8218 - nice comma
// 8219 - upside down nice left single quote
// 8220 - nice left double quote
// 8221 - nice right double quote
// 8222 - nice left double quote, bottom
// 8224 - cross
// 8225 - double cross
// 8226 - big dot
// 8230 - elipses
// 8240 - basis points
// 8242 - single tick
// 8243 - double quote
// 8245 - back tick
// 8249 - small <
// 8250 - small >
// 8252 - !!
// 8253 - ?! joined
// 8254 - high bar
// 8255 - low bar
// 8260 - broken /
// 8263 - ??
// 8264 - ?! separate
// 8265 - !? separate
// 8364 - euro
// 8482 - TM

# The `user_input` any key input

```lua
x = user_input("> ", false, true)
```
Captures any key input:

* Tab, Escape
* UpArrow, DownArrow, etc
* F1, F2, etc
* Delete, Backspace, Home, End, PageUp, PageDown
* LeftApple (super key), LeftAlt, LeftControl, LeftShift, RightApple, etc.
* Enter key -> empty string.
* The `~` key is not registered.

# The `virus` format function

Used to draw text in all kinds of location on a single line; includes expanding the line out to a much taller area.

```lua

f=function(l)
    // character size: 10x24
    x=10
    y=24
    out=""
    while l.len>0
        scale=1
        obj=l[0]
        text=obj.indexes[0]
        vals=obj[text]
        rot=-vals[2]
        torot=""
        toscale=""
        if scale!=1 then toscale="<size="+(scale*100)+"%>"
        torot="<rotate="+(rot)+">"
        tox="<pos="+((vals[0]*x)*scale)+">"
        toy="<voffset="+((-vals[1]*y)*scale)+">"
        if vals[3]==1 then
            num=0
            for let in text
                ang=(rot*(pi/180))
                posx=(cos(ang)*num)*10
                posy=(sin(ang)*num)*10
                out=out+toscale+torot+"<pos="+(((vals[0]*x)*scale)+posx)+"><voffset="+(((-vals[1]*y)*scale)+posy)+">"+let
                num=num+1
            end for
        else
            out=out+toscale+torot+tox+toy+text
        end if
        l.pull
    end while
    return out
end function

```