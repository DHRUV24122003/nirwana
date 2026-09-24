# # import modal
# # from pydantic import BaseModel
# # from typing import Optional
# # import torch
# # import torchaudio
# # import os
# # import uuid
# # import boto3
# # from botocore.exceptions import ClientError
# # from gtts import gTTS  # placeholder TTS - real model ke liye uncomment karo

# # # Modal App define karo
# # app = modal.App("ai-voice-studio-dhruv")

# # # Image with dependencies - order important hai (numpy pehle for Torch init)
# # image = (
# #     modal.Image.debian_slim(python_version="3.11")
    
# #     # Step 1: NumPy pehle (Torch initialization warning fix)
# #     .pip_install("numpy==1.26.0")
    
# #     # Step 2: Torch aur torchaudio (stable version)
# #     .pip_install("torch==2.3.0", "torchaudio==2.3.0")
    
    
# #     # Step 3: Baaki sab packages
# #     .pip_install(
# #         "gtts",                  # TTS ke liye
# #         "boto3",                 # S3 ke liye
# #         "botocore",
# #         "pydantic",
# #         "fastapi[standard]",     # FastAPI endpoint ke liye (standard extensions)
# #         "uvicorn"                # FastAPI server
# #     )
    
# #     .apt_install("ffmpeg")       # audio processing ke liye
# # )

# # # HuggingFace cache volume
# # volume = modal.Volume.from_name("hf-cache-ai-voice-studio", create_if_missing=True)

# # # AWS Secret (dashboard se banaya hua)
# # aws_secret = modal.Secret.from_name("aws-voice-studio-aws-secret")

# # # Request aur Response models
# # class TextToSpeechRequest(BaseModel):
# #     text: str
# #     voice_s3_key: Optional[str] = None
# #     language: str = "hi"           # default Hindi
# #     exaggeration: float = 0.5
# #     cfg_weight: float = 0.5

# # class TextToSpeechResponse(BaseModel):
# #     s3_key: str



# # @app.cls(
# #     image=image,
# #     gpu="T4",                      # Starter plan ke liye T4, L40S paid hai
# #     volumes={"/root/.cache/huggingface": volume},
# #     secrets=[aws_secret],
# #     timeout=600,                   # 10 minute timeout
# # )
# # class TextToSpeechServer:
# #     @modal.enter()
# #     def load_model(self):
# #         print("Loading model placeholder...")
# #         # Real model yaha load karo (uncomment jab ready ho)
# #         #from chatterbox.mtl_tts import ChatterboxMultilingualTTS
# #         #self.model = ChatterboxMultilingualTTS.from_pretrained(device="cuda")

# #     # @modal.fastapi_endpoint(method="POST")
    
# #     # @modal.fastapi_endpoint(method="POST")
# #     # def generate_speech(self, request: TextToSpeechRequest) -> TextToSpeechResponse:
# #     #     # Placeholder TTS using gTTS (real model ke liye replace karo)
# #     #     tts = gTTS(text=request.text, lang=request.language)
# #     #     local_path = "/tmp/output.mp3"
# #     #     tts.save(local_path)

# #     #     # Load audio and convert to WAV
# #     #     wav, sr = torchaudio.load(local_path)
# #     #     wav_cpu = wav.cpu()

# #     #     temp_wav = "/tmp/temp.wav"
# #     #     torchaudio.save(temp_wav, wav_cpu, sr, format="wav")

# #     #     # S3 upload
# #     #     s3 = boto3.client("s3")
# #     #     bucket_name = "ai-voice-studio-dhruv"
# #     #     s3_key = f"tts/{uuid.uuid4()}.wav"

# #     #     # Automatic mount path use karo (/mnt/<bucket-name>)
# #     #     s3_path = f"/mnt/ai-voice-studio-dhruv/{s3_key}"
# #     #     os.makedirs(os.path.dirname(s3_path), exist_ok=True)
# #     #     with open(s3_path, "wb") as f:
# #     #         f.write(open(temp_wav, "rb").read())

# #     #     try:
# #     #         print(f"Uploaded to s3://{bucket_name}/{s3_key}")
# #     #     except Exception as e:
# #     #         print(f"S3 upload failed: {e}")
# #     #         raise
# #     #     finally:
# #     #         os.remove(local_path)
# #     #         os.remove(temp_wav)

# #     #     return TextToSpeechResponse(s3_key=s3_key)


# # # @modal.fastapi_endpoint(method="POST")
   
# # # def generate_speech(self, request: TextToSpeechRequest) -> TextToSpeechResponse:
# # #     # Placeholder TTS using gTTS
# # #     tts = gTTS(text=request.text, lang=request.language)
# # #     local_path = "/tmp/output.mp3"
# # #     tts.save(local_path)

# # #     # Load audio and convert to WAV
# # #     wav, sr = torchaudio.load(local_path)
# # #     wav_cpu = wav.cpu()

# # #     temp_wav = "/tmp/temp.wav"
# # #     torchaudio.save(temp_wav, wav_cpu, sr, format="wav")

# # #     # S3 upload
# # #     s3 = boto3.client("s3")
# # #     bucket_name = "ai-voice-studio-dhruv"
# # #     s3_key = f"tts/{uuid.uuid4()}.wav"  # Pehle define karo (scope ke bahar)

# # #     upload_success = False
# # #     try:
# # #         s3.upload_file(temp_wav, bucket_name, s3_key)
# # #         print(f"Uploaded to s3://{bucket_name}/{s3_key}")
# # #         upload_success = True
# # #     except Exception as e:
# # #         print(f"S3 upload failed: {e}")
# # #         raise  # Raise karo taaki error response mein dikhe
# # #     finally:
# # #         os.remove(local_path)
# # #         os.remove(temp_wav)

# # #     if not upload_success:
# # #         raise Exception("S3 upload failed - check logs")

# # #     return TextToSpeechResponse(s3_key=s3_key)







# import io
# import os
# import sys
# from typing import Optional
# import uuid

# import modal 

# from pydantic import BaseModel 

# import torch
# import torchaudio

# app = modal.App("ai-voice-studio-dhruv")

# # image = (
# #     modal.Image.debian_slim(python_version="3.11")
# #     .pip_install("numpy==1.26.0", "torch==2.6.0")
# #     .pip_install_from_requirements("requirements.txt")
# #     .apt_install("ffmpeg")
# # )
# image = (
#     modal.Image.debian_slim(python_version="3.11")
#     .pip_install("numpy==1.26.0")
#     .pip_install("torch==2.3.0", "torchaudio==2.3.0")
#     .pip_install("gtts", "boto3", "botocore", "pydantic", "fastapi[standard]", "uvicorn")
#     .apt_install("ffmpeg")
# )

# volume = modal.Volume.from_name("hf-cache-ai-voice-studio", create_if_missing=True)

# s3_secret = modal.Secret.from_name("aws-voice-studio-aws-secret")

# class TextToSpeechRequest(BaseModel):
#     text: str
#     voice_s3_key: Optional[str] = None
#     language: str = "en"
#     exaggeration: float = 0.5
#     cfg_weight: float = 0.5


# class TextToSpeechResponse(BaseModel):
#     s3_Key: str

# @app.cls(
#     image=image,
#     gpu="L40S",
#     volumes={
#         "/root/.cache/huggingface": volume,
#         "/s3-mount": modal.CloudBucketMount("ai-voice-studio-dhruv", secret=s3_secret)
#     },
#     scaledown_window=120,
#     secrets=[s3_secret]
# )

# class TextToSpeechServer:
#     @modal.enter()
#     def load_model(self):
#         from chatterbox.mtl_tts import ChatterboxMultilingualTTS
#         self.model = ChatterboxMultilingualTTS.from_pretrained(device="cuda")

#     @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
#     def generate_speech(self, request: TextToSpeechRequest) -> TextToSpeechResponse:
#         with torch.no_grad():
#             if request.voice_s3_Key:
#                 audio_prompt_path = f"/s3-mount/{request.voice_s3_Key}"

#                 if not os.path.exists(audio_prompt_path):
#                     raise FileNotFoundError(
#                         f"Prompt audio not found at {audio_prompt_path}")
#                 wav = self.model.generate(
#                     request.text, 
#                     audio_prompt_path=audio_prompt_path,
#                     language_id=request.language,
#                     exaggeration=request.exaggeration,
#                     cfg_weight=request.cfg_weight
#                 )
#             else:
#                 wav = self.model.generate(
#                     request.text,
#                     language_id=request.language,
#                     exaggeration=request.exaggeration,
#                     cfg_weight=request.cfg_weight
#                 )
#             wav_cpu = wav.cpu()

#         # Convert the audio tensor to WAV format bytes
#         buffer = io.BytesIO()  # Create an in-memory buffer
#         torchaudio.save(buffer, wav_cpu, self.model.sr, format="wav")  # Save as WAV
#         buffer.seek(0)  # Reset buffer position to start
#         audio_bytes = buffer.read()  # Read all bytes            


#         audio_uuid = str(uuid.uuid4())  
#         s3_Key = f"tts/{audio_uuid}.wav"


#         s3_path = f"/s3-mount/{s3_Key}" 
#         os.makedirs(os.path.dirname(s3_path), exist_ok=True)
#         with open(s3_path, "wb") as f:
#             f.write(audio_bytes)
#         print(f"Saved audio to S3: {s3_Key}")
#         return TextToSpeechResponse(s3_Key=s3_Key)








import modal
from pydantic import BaseModel
from typing import Optional
import torch
import torchaudio
import os
import uuid
import boto3
from botocore.exceptions import ClientError
from gtts import gTTS  # placeholder TTS

app = modal.App("ai-voice-studio-dhruv")

# Image with all dependencies (pydantic + torch sahi order mein)
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("numpy==1.26.0")  # pehle numpy (torch ke liye zaroori)
    .pip_install("torch==2.3.0", "torchaudio==2.3.0")  # stable version
    .pip_install("gtts", "boto3", "botocore", "pydantic", "fastapi[standard]", "uvicorn")
    .apt_install("ffmpeg")
)

# HuggingFace cache volume (optional – agar real model use karega toh rakh)
volume = modal.Volume.from_name("hf-cache-ai-voice-studio", create_if_missing=True)

# AWS Secret
aws_secret = modal.Secret.from_name("aws-voice-studio-aws-secret")

# Request aur Response models
class TextToSpeechRequest(BaseModel):
    text: str
    voice_s3_key: Optional[str] = None
    language: str = "hi"           # default Hindi
    exaggeration: float = 0.5
    cfg_weight: float = 0.5

class TextToSpeechResponse(BaseModel):
    s3_key: str

@app.cls(
    image=image,
    gpu="T4",                      # Starter plan ke liye T4 (L40S paid hai)
    volumes={"/root/.cache/huggingface": volume},
    secrets=[aws_secret],
    timeout=600,                   # 10 minute timeout
)
class TextToSpeechServer:
    @modal.enter()
    def load_model(self):
        print("Loading model placeholder... (using gTTS)")
        # Real model yaha load karo (uncomment jab ready ho)
        # from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        # self.model = ChatterboxMultilingualTTS.from_pretrained(device="cuda")

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
    def generate_speech(self, request: TextToSpeechRequest) -> TextToSpeechResponse:
        # Placeholder TTS using gTTS
        tts = gTTS(text=request.text, lang=request.language)
        local_path = "/tmp/output.mp3"
        tts.save(local_path)

        # Load audio and convert to WAV
        wav, sr = torchaudio.load(local_path)
        wav_cpu = wav.cpu()

        temp_wav = "/tmp/temp.wav"
        torchaudio.save(temp_wav, wav_cpu, sr, format="wav")

        # S3 upload
        s3 = boto3.client("s3")
        bucket_name = "ai-voice-studio-dhruv"
        s3_key = f"tts/{uuid.uuid4()}.wav"

        try:
            s3.upload_file(temp_wav, bucket_name, s3_key)
            print(f"Uploaded to s3://{bucket_name}/{s3_key}")
        except Exception as e:
            print(f"S3 upload failed: {e}")
            raise
        finally:
            os.remove(local_path)
            os.remove(temp_wav)

        return TextToSpeechResponse(s3_key=s3_key)

# Local test ke liye (modal run tts.py chala sakte ho)
@app.local_entrypoint()
def main():
    request = TextToSpeechRequest(text="नमस्ते भाई, यह टेस्ट है।")
    server = TextToSpeechServer()
    response = server.generate_speech.remote(request)
    print("S3 Key:", response.s3_key)