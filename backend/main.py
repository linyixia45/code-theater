from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ast
import uvicorn
import os
from openai import OpenAI
import google.generativeai as genai
import random
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---
class CodeRequest(BaseModel):
    code: str
    language: str
    output_language: str = "en"

class Character(BaseModel):
    name: str
    role: str
    description: str
    type: str = "unknown" # 'function', 'variable', 'class', 'unknown'

class SceneStep(BaseModel):
    action: str # 'enter', 'exit', 'speak', 'action'
    character: str
    details: str = ""
    line: str | None = None

class ScriptResponse(BaseModel):
    characters: list[Character]
    script: list[SceneStep]

# --- AST Analysis ---
class CodeAnalyzer(ast.NodeVisitor):
    def __init__(self):
        self.characters = []
        self.actions = []
        
    def visit_FunctionDef(self, node):
        self.characters.append(Character(
            name=node.name,
            role="Protagonist",
            description=f"A function named {node.name}",
            type="function"
        ))
        self.actions.append(f"Function '{node.name}' is defined with arguments: {[a.arg for a in node.args.args]}")
        self.generic_visit(node)

    def visit_ClassDef(self, node):
        self.characters.append(Character(
            name=node.name,
            role="Leader",
            description=f"A class named {node.name}",
            type="class"
        ))
        self.actions.append(f"Class '{node.name}' is established")
        self.generic_visit(node)

    def visit_Assign(self, node):
        # Rough heuristic to catch major variables
        for target in node.targets:
            if isinstance(target, ast.Name):
                name = target.id
                if not any(c.name == name for c in self.characters):
                    self.characters.append(Character(
                        name=name,
                        role="Data",
                        description=f"A variable named {name}",
                        type="variable"
                    ))
                self.actions.append(f"Variable '{name}' is assigned a value")
        self.generic_visit(node)
        
    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
             self.actions.append(f"Function '{node.func.id}' is called")
        self.generic_visit(node)

import httpx
from zhipuai import ZhipuAI

def generate_script_with_zhipu(code: str, analysis: CodeAnalyzer, output_language: str = "en") -> ScriptResponse:
    try:
        api_key = os.environ.get("ZHIPUAI_API_KEY")
        if not api_key:
             return generate_deterministic_script(analysis)
             
        client = ZhipuAI(api_key=api_key)
        prompt = get_prompt(code, analysis)
        
        if output_language == "zh":
             prompt += "\n\nIMPORTANT: Please generate all character descriptions, details, and dialogue in CHINESE (简体中文)."
             prompt += "\nMake the dialogue funny, witty, and engaging. Use metaphors related to programming."
             prompt += "\nIf there are syntax errors or logical issues in the code, have the characters gently mock the user or point it out politely."
        elif output_language == "ja":
             prompt += "\n\nIMPORTANT: Please generate all character descriptions, details, and dialogue in JAPANESE (日本語)."
             prompt += "\nMake the dialogue anime-style, dramatic, and emotional."
        elif output_language == "fr":
             prompt += "\n\nIMPORTANT: Please generate all character descriptions, details, and dialogue in FRENCH (Français)."
             prompt += "\nMake the dialogue artistic, philosophical, and dramatic."
        else:
             prompt += "\n\nIMPORTANT: Please generate all character descriptions, details, and dialogue in ENGLISH."
             prompt += "\nMake the dialogue witty, sarcastic, and technical."
        
        prompt += "\nIf the code contains errors, instead of failing, create a character named 'Bug' who explains the mistake in a funny way."
        
        response = client.chat.completions.create(
            model="glm-4-flash",  # Free/Fast model
            messages=[
                {"role": "system", "content": "You are a creative playwright turning code into theater. Output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
        )
        
        # Zhipu response parsing
        content = response.choices[0].message.content
        # Strip markdown if present
        if content.startswith("```json"):
            content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content.rsplit("\n", 1)[0]
        elif content.startswith("```"):
             content = content.split("\n", 1)[1].rsplit("\n", 1)[0]
             
        data = json.loads(content)
        return ScriptResponse(**data)
    except Exception as e:
        print(f"ZhipuAI Error: {e}")
        return generate_deterministic_script(analysis)

def generate_script_with_deepseek(code: str, analysis: CodeAnalyzer) -> ScriptResponse:
    try:
        api_key = os.environ.get("DEEPSEEK_API_KEY")
        if not api_key:
             return generate_deterministic_script(analysis)
             
        prompt = get_prompt(code, analysis)
        
        # DeepSeek API (OpenAI compatible)
        # Using direct httpx call or configuring OpenAI client for custom base_url
        client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
        
        completion = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a creative playwright turning code into theater. Output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        data = json.loads(completion.choices[0].message.content)
        return ScriptResponse(**data)
    except Exception as e:
        print(f"DeepSeek Error: {e}")
        return generate_deterministic_script(analysis)

# --- LLM Integration ---
def get_prompt(code: str, analysis: CodeAnalyzer) -> str:
    char_summary = "\n".join([f"- {c.name} ({c.type}): {c.description}" for c in analysis.characters])
    action_summary = "\n".join([f"- {a}" for a in analysis.actions])
    
    return f"""
    You are a playwright for a 'Code Theater'. Your job is to turn code execution into a short, funny script.
    
    Code:
    ```python
    {code}
    ```
    
    Characters extracted:
    {char_summary}
    
    Key Actions:
    {action_summary}
    
    Create a JSON response with:
    1. A list of 'characters' (name, role, description). Feel free to add personality to them based on the code.
    2. A 'script' (list of steps). Each step has:
       - 'action': 'enter', 'exit', 'speak', 'action'
       - 'character': name of the character
       - 'details': description of what they do
       - 'line': dialogue (optional, make it funny/relevant to the code logic)
       
    The script should follow the flow of the code. If there's a loop, make the character complain about doing it again. If there's a bug, make a 'Bug' character appear.
    """

def generate_script_with_openai(code: str, analysis: CodeAnalyzer) -> ScriptResponse:
    try:
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        prompt = get_prompt(code, analysis)
        
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo", 
            messages=[
                {"role": "system", "content": "You are a creative playwright turning code into theater. Output valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        data = json.loads(completion.choices[0].message.content)
        return ScriptResponse(**data)
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return generate_deterministic_script(analysis)

def generate_script_with_gemini(code: str, analysis: CodeAnalyzer) -> ScriptResponse:
    try:
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = get_prompt(code, analysis) + "\n\nIMPORTANT: Output ONLY valid JSON."
        
        response = model.generate_content(prompt)
        # Gemini sometimes wraps json in ```json ... ```
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] # remove first line
            if text.endswith("```"):
                text = text.rsplit("\n", 1)[0] # remove last line
        
        data = json.loads(text)
        return ScriptResponse(**data)
    except Exception as e:
        print(f"Gemini Error: {e}")
        return generate_deterministic_script(analysis)

def generate_deterministic_script(analysis: CodeAnalyzer) -> ScriptResponse:
    print("Using Deterministic Fallback Generator")
    script = []
    
    # 1. Intro
    for char in analysis.characters:
        script.append(SceneStep(
            action="enter",
            character=char.name,
            details=f"{char.name} enters the stage.",
            line=f"Hello, I am {char.name}, a {char.type}!"
        ))
        
    # 2. Action based on AST events
    for action_desc in analysis.actions:
        actor = random.choice(analysis.characters).name if analysis.characters else "Narrator"
        
        if "assigned" in action_desc:
            script.append(SceneStep(
                action="action",
                character=actor,
                details=f"{actor} processes data.",
                line="Storing this for later..."
            ))
        elif "called" in action_desc:
            script.append(SceneStep(
                action="speak",
                character=actor,
                details=f"{actor} calls out.",
                line="Hey! I need some help here!"
            ))
        else:
             script.append(SceneStep(
                action="action",
                character=actor,
                details=action_desc,
                line="Work work work..."
            ))
            
    # 3. Outro
    for char in analysis.characters:
        script.append(SceneStep(
            action="exit",
            character=char.name,
            details=f"{char.name} leaves.",
            line="My job here is done."
        ))
        
    return ScriptResponse(characters=analysis.characters, script=script)

@app.get("/")
def read_root():
    return {"message": "Code Theater API is running"}

@app.get("/health")
def health_check():
    return {
        "status": "ok", 
        "openai": bool(os.environ.get("OPENAI_API_KEY")),
        "gemini": bool(os.environ.get("GEMINI_API_KEY")),
        "deepseek": bool(os.environ.get("DEEPSEEK_API_KEY")),
        "zhipu": bool(os.environ.get("ZHIPUAI_API_KEY"))
    }

@app.post("/parse", response_model=ScriptResponse)
def parse_code(request: CodeRequest):
    print(f"Received parse request for language: {request.language}")
    print(f"Code snippet: {request.code[:50]}...")
    
    if request.language.lower() != "python":
        raise HTTPException(status_code=400, detail="Only Python is supported currently")
    
    try:
        tree = ast.parse(request.code)
        analyzer = CodeAnalyzer()
        analyzer.visit(tree)
        
        # If no characters found, add default
        if not analyzer.characters:
             analyzer.characters.append(Character(name="Ghost", role="Extra", description="An empty spirit", type="unknown"))
        
        # Priority: Zhipu > DeepSeek > OpenAI > Gemini > Deterministic
        if os.environ.get("ZHIPUAI_API_KEY"):
            return generate_script_with_zhipu(request.code, analyzer, request.output_language)
        elif os.environ.get("DEEPSEEK_API_KEY"):
             return generate_script_with_deepseek(request.code, analyzer)
        elif os.environ.get("OPENAI_API_KEY"):
            return generate_script_with_openai(request.code, analyzer)
        elif os.environ.get("GEMINI_API_KEY"):
            return generate_script_with_gemini(request.code, analyzer)
        else:
            return generate_deterministic_script(analyzer)
            
    except SyntaxError:
        # Instead of 400, let's try to visualize the error!
        error_char = Character(name="SyntaxError", role="Villain", description="A parsing demon", type="unknown")
        error_step = SceneStep(
            action="speak", 
            character="SyntaxError", 
            details="Appears with a red cross", 
            line="I cannot understand this code! It is invalid Python syntax. Please fix it!"
        )
        # We can try to use LLM to generate a better error message if we want, but for now simple fallback
        return ScriptResponse(characters=[error_char], script=[error_step])
        
    except Exception as e:
        print(f"Error: {e}")
        # Return fallback on error instead of 500 if possible, but for debugging 500 is better
        # raise HTTPException(status_code=500, detail=str(e))
        return generate_deterministic_script(analyzer)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
