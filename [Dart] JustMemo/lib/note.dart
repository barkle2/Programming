// lib/note.dart

class Note {
  final String id; // Unique ID for the memo
  String content;   // Memo content (no separate title field)
  final DateTime createdTime; // Creation timestamp
  DateTime updatedTime; // Last updated timestamp

  Note({
    required this.id,
    required this.content, 
    required this.createdTime,
    required this.updatedTime,
  });

  // Convert Note object to Map for SharedPreferences storage
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'content': content,
      'createdTime': createdTime.toIso8601String(),
      'updatedTime': updatedTime.toIso8601String(),
    };
  }

  // Factory constructor to create Note object from Map
  factory Note.fromMap(Map<String, dynamic> map) {
    return Note(
      id: map['id'] as String,
      content: map['content'] as String,
      createdTime: DateTime.parse(map['createdTime'] as String),
      updatedTime: DateTime.parse(map['updatedTime'] as String),
    );
  }
}