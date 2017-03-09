'use strict'

const vscode = require('vscode');
const adapter = require('./evernote-adapter.js');
const converter = require('./converter.js');
// const EvernoteContentProvider = require('./evernote-content-provider');

//TODO do sth with canceltoken
//TODO do sth with catch()

const docToNoteMetas = {};

function openDocWithContent(selectedMeta, content) {
    console.log('note content:' + content);

    vscode.workspace.openTextDocument({language: 'markdown'}).then(doc => {
        docToNoteMetas[doc] = selectedMeta;
        return vscode.window.showTextDocument(doc);
    }).then(editor => {
        let startPos = new vscode.Position(1,0);
        editor.edit(edit => {
            let mdContent = converter.toMd(content);
            edit.insert(startPos, mdContent);
        });
    });
}

function navToOneNote() {
    console.log('nav to one');

    let notebooks, noteMetas, selectedMeta;
    
    adapter.listNoteBooks().then(allNotebooks => {
        notebooks = allNotebooks;
        let allNoteBookNames = allNotebooks.map(notebook => notebook.name);
        
        return vscode.window.showQuickPick(allNoteBookNames);
        
    }).then(selected => {
        let selectedGuid = notebooks.find(notebook => notebook.name === selected).guid;
        return adapter.listAllNoteMetas(selectedGuid);
        
    }).then(metaList => {
        noteMetas = metaList.notes;
        let allNoteTitles = noteMetas.map(noteMeta => noteMeta.title);
        
        return vscode.window.showQuickPick(allNoteTitles);
        
    }).then(selected => {
        selectedMeta = noteMetas.find(meta => meta.title === selected);
        return adapter.getNoteContent(selectedMeta.guid);
        
    }).then(noteContent => {
        openDocWithContent(selectedMeta, noteContent);
    });
}

function updateNote() {
    let activeDoc = vscode.window.activeTextEditor.document;
    let meta = docToNoteMetas[activeDoc];

    if (meta) {
        // console.log('out: ' + activeDoc.getText());
        let convertedContent = converter.toEnml(activeDoc.getText());
        console.log('converted out:' + convertedContent);

        adapter.updateNoteContent(meta.guid, meta.title, convertedContent).then(note => {
            // console.log('update timestamp: ' + note.updated);
            vscode.window.showInformationMessage('Note updated at: ' + new Date(note.updated));
        }).catch(reason => {
            vscode.window.showErrorMessage('Note update failed: ' + JSON.stringify(reason));
        });
    }
}

function activate(context) {
    let navToOneNoteCmd = vscode.commands.registerCommand('extension.navToOneNote', navToOneNote);
    let updateNoteCmd = vscode.commands.registerCommand('extension.updateNote', updateNote);
    // let customProvider = vscode.workspace.registerTextDocumentContentProvider('evernote', new EvernoteContentProvider());
    
    context.subscriptions.push(navToOneNoteCmd);
    context.subscriptions.push(updateNoteCmd);
    // context.subscriptions.push(customProvider);
}

function deactivate() {
}

exports.activate = activate;
exports.deactivate = deactivate;