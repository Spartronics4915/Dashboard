/* global app, ace, $, Widget */
class TextEditorWidget extends Widget
{
    constructor(config, targetElem, pageHandler)
    {
        super(config, targetElem, pageHandler);
        this.params = this.config.params;
        this.targetId = targetElem.attr("id");
        this.titleId = `${this.targetId}Title`;
        this.filenmId = `${this.targetId}FN`;
        this.editorId = `${this.targetId}Editor`;
        let w = this.config.size[0];
        let h = this.config.size[1];
        let html = 
        `<span class="paneltitle" id='${this.titleId}'>${this.params.title}</span>` +
        `<span id='${this.filenmId}'></span>` +
        `<div class='textEditorWidget' style='width:${w}px;height:${h}px'>` +
            `<div class='textEditor' id='${this.editorId}'></div>` +
        "</div>";
        targetElem.html(html);
        this.editor = ace.edit(this.editorId);
        if(this.params.theme)
            this.editor.setTheme(this.params.theme);
        else
            this.editor.setTheme("ace/theme/terminal");
        if(this.params.mode)
            this.editor.session.setMode(this.params.mode);
        this.editor.session.setTabSize(4);
        this.editor.session.setUseSoftTabs(true);
        this.editor.on("change", this._onChange.bind(this));
        this.editor.commands.addCommand({
            name: "save",
            bindKey: {win: "Ctrl-S",  mac: "Command-S"},
            exec: this._onSave.bind(this),
            readOnly: false // false if this command should not apply in readOnly mode
        });
    }

    _onChange(delta)
    {
        let newdirty = !this.editor.session.getUndoManager().isClean();
        if(newdirty != this.dirty)
        {
            this.dirty = newdirty;
            if(this.dirty)
                $(`#${this.filenmId}`).html(this.filenm + " *");
            else
                $(`#${this.filenmId}`).html(this.filenm);
        }
    }

    _onSave()
    {
        // app.notice("onsave");
        if(0 == app.setFileContents(this.params.filesystem, this.filenm,
                            this.editor.session.getValue()))
            this._makeClean();
    }

    valueChanged(key, value, isNew)
    {
        if(app.ntkeyNormalize(this.params.pastekey) == key)
        {
            if(isNew) return; /* on first connection */
            let cursorPosition = this.editor.getCursorPosition();
            this.editor.session.insert(cursorPosition, value);
        }
        else
        {
            // the value is assumed to a "file name"
            // XXX: if the current file is dirty, we could stash its contents
            //  and re-apply, etc.  ace has a multi-session support which might
            //  be the way to go.
            this.filenm = value;
            $(`#${this.filenmId}`).html(value);
            let txt = app.getFileContents(this.params.filesystem, value);
            this.editor.session.setValue(txt);
            this._makeClean();
        }
    }

    _makeClean()
    {
        // make clean, need another _onChange to update dirty...
        this.editor.session.setUndoManager(new ace.UndoManager());
        this._onChange(); 
    }
}

Widget.AddWidgetClass("texteditor", TextEditorWidget);