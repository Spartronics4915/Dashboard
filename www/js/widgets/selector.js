/* global $, Widget, app */
class SelectorWidget extends Widget
{
    // magic html notes:
    //  - a select within a custom-select div is hidden, then
    //    replaced with extra styleable divs
    //  - we need to convey our nettab key to the code-point where
    //    user selects new options.
    //  - we establish our relative nt key: (eg Robot/Verbosity) as
    //     the id of custom selector.  Now during pick event, we would pull
    //     the nettab key off the DOM select node. 
    //  - Similarly, if the valueChanged method is called, we need to locate
    //      the .select-selected item and update its contents.
    //  - NB: for "fancy" element selector expressions, the / and likely
    //      ' ' characters will be problematic. To skirt the /  problem we
    //      use the targetId as the outer container to qualify the search.
    constructor(config, targetElem)
    {
        super(config, targetElem);
        this.params = this.config.params;
        this.targetId = targetElem.attr("id");

        if(!this.params.width)
            this.params.width = "50px";
        if(!this.params.options)
            this.params.options = ["No options", "Have been",  "Provided"];
        let html = `<span class='custom-select-title'>${this.config.label}</span>`;
        html += `<div class='custom-select' style='width:${this.params.width}'>`;
        html += `<select id='${this.config.id}'>`; // this is hidden and replaced by installSelectorSupport
        for(let i=0;i<this.params.options.length;i++)
            html += `<option>${this.params.options[i]}</option>`;
        html += "</select></div>";
        targetElem.html(html);
    }

    optionsChanged(opts)
    {
        // first change html options (which may be hidden)
        let html = "";
        for(let i=0;i<opts.length;i++)
            html += `<option>${opts[i]}</option>`;
        let selEl = $(`#${this.targetId} select`)[0];
        selEl.innerHTML = html;

        // next rebuild the menu
        let menuEl = $(`#${this.targetId} .select-items`)[0];
        SelectorWidget.buildOptions(menuEl, selEl);

        // finally should we update the value? (no: it still holds its prior)

    }

    valueChanged(key, value, isNew)
    {
        app.notice(`${key} -> ${value}`);
        let selectEl = $(`#${this.targetId} .select-selected`)[0];
        selectEl.innerHTML = value;
    }

    addRandomPt()
    {
        // no-op
    }

    static buildOptions(menuEl, selEl)
    {
        var c;
        menuEl.innerHTML = "";
        for (let j = 0; j <selEl.length; j++)
        {
            /*for each option in the original select element,
            create a new DIV that will act as an option item:*/
            c = document.createElement("DIV");
            c.innerHTML = selEl.options[j].innerHTML;
            c.addEventListener("click", function(e) 
            {
                /*when an item is clicked, update the original select box,
                and the selected item:*/
                var y, i, k, s, h;
                s = this.parentNode.parentNode.getElementsByTagName("select")[0];
                h = this.parentNode.previousSibling;
                for (i = 0; i < s.length; i++)
                {
                    if (s.options[i].innerHTML == this.innerHTML) 
                    {
                        s.selectedIndex = i;
                        /* here we migrate text to original box...
                            - this is where the selection is made.
                        */
                        app.putValue(selEl.id, this.innerHTML);
                        h.innerHTML = this.innerHTML;
                        y = this.parentNode.getElementsByClassName("same-as-selected");
                        for (k = 0; k < y.length; k++) {
                            y[k].removeAttribute("class");
                        }
                        this.setAttribute("class", "same-as-selected");
                        break;
                    }
                }
                /* here we trigger closeAlLSelect */
                h.click();
            });
            menuEl.appendChild(c);
        }
    }

    static installSelectorSupport()
    {
        /* from: https://www.w3schools.com/howto/howto_custom_select.asp */
        var x, i, j, selEl, a, b, c;
        /*look for any elements with the class "custom-select":*/
        x = document.getElementsByClassName("custom-select");
        for (i = 0; i < x.length; i++)
        {
            selEl = x[i].getElementsByTagName("select")[0];
            /*for each element, create a new DIV that will act as the selected item:*/
            a = document.createElement("DIV");
            a.setAttribute("class", "select-selected");
            a.innerHTML = selEl.options[selEl.selectedIndex].innerHTML;
            x[i].appendChild(a);
            /*for each element, create a new DIV that will contain the option list:*/
            b = document.createElement("DIV");
            b.setAttribute("class", "select-items select-hide");
            SelectorWidget.buildOptions(b, selEl);
            x[i].appendChild(b);
            a.addEventListener("click", function (e) 
            {
                /*when the select box is clicked, close any other select boxes,
                and open/close the current select box:*/
                e.stopPropagation();
                closeAllSelect(this);
                this.nextSibling.classList.toggle("select-hide");
                this.classList.toggle("select-arrow-active");
            });
        }
        function closeAllSelect(elmnt) 
        {
            /*a function that will close all select boxes in the document,
            except the current select box:*/
            var x, y, i, arrNo = [];
            x = document.getElementsByClassName("select-items");
            y = document.getElementsByClassName("select-selected");
            for (i = 0; i < y.length; i++) 
            {
                if (elmnt == y[i]) 
                    arrNo.push(i);
                else 
                    y[i].classList.remove("select-arrow-active");
            }
            for (i = 0; i < x.length; i++) 
            {
                if (arrNo.indexOf(i))
                    x[i].classList.add("select-hide");
            }
        }
        /*if the user clicks anywhere outside the select box,
        then close all select boxes:*/
        document.addEventListener("click", closeAllSelect);
    }
}

Widget.AddWidgetClass("selector", SelectorWidget);