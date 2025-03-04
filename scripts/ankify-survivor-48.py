import os
import sys
import requests
import json

def request_anki(action, **params):
    """Send a request to the Anki Connect API"""
    return {'action': action, 'params': params, 'version': 6}

def invoke_anki(action, **params):
    """Invoke an action on the Anki Connect API"""
    requestJson = json.dumps(request_anki(action, **params)).encode('utf-8')
    response = requests.post('http://localhost:8765', requestJson)
    response_data = json.loads(response.content)
    
    if len(response_data) != 2:
        raise Exception('Response has an unexpected number of fields')
    if 'error' not in response_data:
        raise Exception('Response is missing required error field')
    if 'result' not in response_data:
        raise Exception('Response is missing required result field')
    if response_data['error'] is not None:
        raise Exception(response_data['error'])
    
    return response_data['result']

def create_anki_cards_from_folder(images_folder_path, deck_name):
    """
    Create Anki flashcards for Survivor contestants by loading images from a folder.
    Each flashcard will have the contestant's photo on the front and their name on the back.
    """
    # Check if Anki is running and AnkiConnect is available
    try:
        version = invoke_anki('version')
        print(f"Connected to Anki. AnkiConnect API version: {version}")
    except Exception as e:
        print(f"Error connecting to Anki: {e}")
        print("Make sure Anki is running and AnkiConnect plugin is installed.")
        return
    
    # Create deck if it doesn't exist
    try:
        decks = invoke_anki('deckNames')
        if deck_name not in decks:
            raise Exception(f"Deck {deck_name} does not exist")
    except Exception as e:
        print(f"Error creating deck: {e}")
        return
    
    # Check if the Basic model exists
    try:
        models = invoke_anki('modelNames')
        if 'Basic' not in models:
            print("Error: Basic note type not found in Anki")
            return
    except Exception as e:
        print(f"Error checking models: {e}")
        return
    
    # Get list of image files in the folder
    try:
        image_files = [f for f in os.listdir(images_folder_path) if f.endswith('.webp')]
    except Exception as e:
        print(f"Error reading image folder: {e}")
        return
    
    print(f"Found {len(image_files)} image files")
    
    # Create Anki notes for each contestant
    for i, image_file in enumerate(image_files, 1):
        try:
            # Extract name from filename (format: "first-last.webp")
            name_parts = os.path.splitext(image_file)[0].split('-')
            name = ' '.join([part.capitalize() for part in name_parts])
            
            # Full path to the image file
            image_path = os.path.join(images_folder_path, image_file)
            
            # Generate a filename for the image in Anki
            anki_image_filename = f"survivor48_{name.replace(' ', '_')}.webp"
            
            # Create the note with the image file
            note = {
                "deckName": deck_name,
                "modelName": "Basic",
                "fields": {
                    "Front": f'<p>Survivor 48 Contestant</p>',
                    "Back": name
                },
                "tags": ["survivor48", "Survivor"],
                "picture": [{
                    "path": image_path,
                    "filename": anki_image_filename,
                    "fields": ["Front"]
                }]
            }
            
            # Add the note to Anki
            try:
                note_id = invoke_anki('addNote', note=note)
                print(f"Added note for {name} with ID: {note_id}")
            except Exception as e:
                print(f"Error adding note for {name}: {e}")
                
        except Exception as e:
            print(f"Error processing {image_file}: {e}")
    
    print(f"Finished adding {len(image_files)} contestants to Anki deck: {deck_name}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python ankify-survivor-48.py <folder_path>")
        print("Example: python ankify-survivor-48.py ~/Downloads/survivor-cast-48")
        print("\nInstructions:")
        print("1. Download contestant images and save them in a folder")
        print("2. Name each image file using dash-separated format: 'first-last.webp'")
        print("   Example: 'john-smith.webp'")
        print("3. The script will create flashcards with images on the front and names on the back")
        print("4. Make sure Anki is running with the AnkiConnect plugin installed")
        sys.exit(1)
        
    folder_path = os.path.expanduser(sys.argv[1])
    create_anki_cards_from_folder(folder_path, "2-Recent")