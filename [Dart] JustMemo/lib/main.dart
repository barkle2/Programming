// main.dart

import 'package:justmemo/note.dart'; 
import 'package:justmemo/note_edit_page.dart'; 
import 'package:flutter/material.dart';
import 'dart:convert'; // For JSON encoding/decoding
import 'package:shared_preferences/shared_preferences.dart'; // For persistent data storage


// 1. App entry point
void main() {
  runApp(const MyApp());
}

// 2. App root widget
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'JustMemo', // App Name
      debugShowCheckedModeBanner: false, // Disable debug banner
      theme: ThemeData(
        primarySwatch: Colors.blue, // Primary color theme
        appBarTheme: const AppBarTheme(
          elevation: 0, // Flat design for AppBar
        ),
      ),
      home: const NoteListPage(), // Initial screen
    );
  }
}

// --- Note List Screen ---

class NoteListPage extends StatefulWidget {
  const NoteListPage({super.key});

  @override
  State<NoteListPage> createState() => _NoteListPageState();
}

class _NoteListPageState extends State<NoteListPage> {
  // List to hold all Note objects
  List<Note> notes = []; 
  final String _notesKey = 'notes_data'; // Key for SharedPreferences
  late SharedPreferences _prefs; // Instance of SharedPreferences

  @override
  void initState() {
      super.initState();
      _initializePrefsAndLoadNotes(); 
  }

  // Initialize SharedPreferences and load data
  Future<void> _initializePrefsAndLoadNotes() async {
      _prefs = await SharedPreferences.getInstance();
      _loadNotes(); 
  }

  // Load memo data from SharedPreferences
  Future<void> _loadNotes() async {    
    final String? notesJsonString = _prefs.getString(_notesKey);

    if (notesJsonString != null) {
      final List<dynamic> notesMapList = jsonDecode(notesJsonString);
      setState(() {
        // Convert Map list to Note object list
        notes = notesMapList.map((map) => Note.fromMap(map as Map<String, dynamic>)).toList();
      });
    }
  }

  // Save current memo list to SharedPreferences
  Future<void> _saveNotes() async {    
    // Convert Note object list to JSON string
    final List<Map<String, dynamic>> notesMapList = notes.map((note) => note.toMap()).toList();
    final String notesJsonString = jsonEncode(notesMapList);

    await _prefs.setString(_notesKey, notesJsonString);
  }

  // Handle result when returning from NoteEditPage
  void _handleNoteResult(Note? resultNote) async {
    if (resultNote == null) {
      return; // No action if no note object is returned
    }
    
    setState(() {
      // Find index of existing note
      int index = notes.indexWhere((note) => note.id == resultNote.id);
      
      if (index != -1) {
        // Update existing note
        notes[index] = resultNote;
      } else {
        // Add new note to the beginning of the list
        notes.insert(0, resultNote);
      }
    });
    
    // Save the updated list
    await _saveNotes();
  }

  // Delete a specific note
  void _deleteNote(Note noteToDelete) async {
      setState(() {
          notes.removeWhere((note) => note.id == noteToDelete.id);          
      });
      await _saveNotes(); // Wait for save to complete

      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Note deleted.')),
      );
  }

  // Show confirmation dialog before deleting a memo
  void _showDeleteConfirmationDialog(BuildContext context, Note noteToDelete) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Delete Memo'),
          content: const Text('Delete this memo?'),
          actions: <Widget>[
            TextButton(
              child: const Text('Cancel'),
              onPressed: () {
                Navigator.of(context).pop(); // Close dialog
              },
            ),
            TextButton(
              child: const Text('Delete', style: TextStyle(color: Colors.red)),
              onPressed: () {
                Navigator.of(context).pop(); // Close dialog
                _deleteNote(noteToDelete);   // Call delete function
              },
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Memos'),
      ),
      body: notes.isEmpty
          ? const Center(child: Text('Tap the ➕ button to add memo.'))
          : ListView.builder(
              itemCount: notes.length,
              itemBuilder: (context, index) {
                final note = notes[index];
                return ListTile( 
                  // Long press event for deletion confirmation
                  onLongPress: () {
                    _showDeleteConfirmationDialog(context, note);
                  },
                  
                  // Main memo text (first line only, truncated to 16 chars)
                  title: Text(
                    _getNoteTitle(note.content),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ), 
                  
                  // Trailing widget shows last updated time (YYYY.M.D H:M)
                  trailing: Text(
                    '${note.updatedTime.year}.'
                    '${note.updatedTime.month}.'
                    '${note.updatedTime.day} '
                    '${note.updatedTime.hour}:'
                    '${note.updatedTime.minute}',
                    style: const TextStyle(fontSize: 12.0, color: Colors.grey),
                  ),
                  
                  onTap: () {
                    _navigateToEditPage(note);
                  },
                );
              },
            ),
      // Floating action button to add new memo
      floatingActionButton: FloatingActionButton(
        onPressed: () => _navigateToEditPage(null), 
        child: const Icon(Icons.add),
      ),
    );
  }

  // Function to navigate to edit page and await result
  void _navigateToEditPage(Note? note) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => NoteEditPage(note: note)),
    );

    if (result != null && result is Note) {
      _handleNoteResult(result);
    }
  }

  // Helper function to extract and format the title from content
  String _getNoteTitle(String content) {
    // Get the first line and trim whitespace
    final firstLine = content.split('\n').first.trim();

    // Truncate to 16 characters if too long
    if (firstLine.length > 16) {
      return '${firstLine.substring(0, 16)}...';
    }
    
    // Return placeholder if empty
    return firstLine.isEmpty ? 'New Memo' : firstLine;
  }
}