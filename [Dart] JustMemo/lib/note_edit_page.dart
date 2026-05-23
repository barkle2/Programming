// lib/note_edit_page.dart

import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart'; // For generating unique IDs
import 'note.dart';

// Screen for writing or editing a memo
class NoteEditPage extends StatefulWidget {
  final Note? note; // Note object to edit, or null for new memo

  const NoteEditPage({super.key, required this.note});

  @override
  State<NoteEditPage> createState() => _NoteEditPageState();
}

class _NoteEditPageState extends State<NoteEditPage> {
  final TextEditingController _contentController = TextEditingController(); 
  bool _isNewNote = true; // Tracks whether it's a new note or an edit

  @override
  void initState() {
    super.initState();
    // Load existing content if editing
    if (widget.note != null) {
      _isNewNote = false;
      _contentController.text = widget.note!.content;
    }
  }

  // Saves the memo and returns the Note object to the list screen
  void _saveNote() {
    final now = DateTime.now();
    final newContent = _contentController.text.trim();

    if (newContent.isEmpty) { 
        // Show warning if content is empty
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Memo content must not be empty to save.')),
        );
        return;
    }

    final Note resultNote;

    if (_isNewNote) {
      // Create new Note object
      resultNote = Note(
        id: const Uuid().v4(), // Generate unique ID
        content: newContent, 
        createdTime: now,
        updatedTime: now,
      );
    } else {
      // Update existing Note object
      resultNote = Note(
        id: widget.note!.id,
        content: newContent, 
        createdTime: widget.note!.createdTime,
        updatedTime: now,
      );
    }

    // Pop the screen, returning the saved Note object
    Navigator.pop(context, resultNote);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isNewNote ? 'New Memo' : 'Edit Memo'),
        actions: [
          // Save button
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _saveNote, 
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Content input field (takes up remaining space)
            Expanded(
              child: TextField(
                controller: _contentController,
                decoration: const InputDecoration(
                  hintText: 'Write your memo here...',
                  border: InputBorder.none, // Clean look
                ),
                keyboardType: TextInputType.multiline,
                maxLines: null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}