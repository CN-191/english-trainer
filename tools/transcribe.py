# Wandelt eine Preply-Aufnahme (ZIP mit part_01.webm, part_02.webm, ...) lokal in Text um.
# Preply nimmt in Stereo auf: ein Kanal pro Person. Jeder Kanal wird einzeln erkannt,
# danach werden beide nach Zeit zusammengeführt – so steht bei jedem Satz, wer spricht.
#
#   python tools/transcribe.py <aufnahme.zip> <zielordner> [modell]
#
# Ergebnis im Zielordner: <name>.json (alle Abschnitte) und <name>.txt (lesbares Protokoll).
# Braucht faster-whisper (pip install faster-whisper); das Modell lädt beim ersten Mal herunter.
import io
import json
import os
import sys
import time
import zipfile

import av
import numpy as np
from faster_whisper import WhisperModel

SR = 16000
# Ein lockerer Beispielsatz mit Füllwörtern: Whisper schreibt dann näher an dem, was wirklich gesagt wurde,
# statt Sätze glatt zu bügeln (wichtig, um Fehler zu finden).
PROMPT = "Um, so, uh, yesterday I have went to the, uh, the meeting and I didn't knew what to say."


def decode_stereo(data):
    # Beide Kanäle getrennt auf 16 kHz (decode_audio aus faster-whisper passt nicht zu neueren PyAV-Versionen)
    res = av.AudioResampler(format='fltp', layout='stereo', rate=SR)
    chunks = []
    with av.open(io.BytesIO(data)) as c:
        for frame in c.decode(audio=0):
            frame.pts = None
            for f in res.resample(frame):
                chunks.append(f.to_ndarray())
    for f in res.resample(None):
        chunks.append(f.to_ndarray())
    a = np.concatenate(chunks, axis=1).astype(np.float32)
    return a[0], a[1]


def log(msg):
    print(time.strftime('%H:%M:%S'), msg, flush=True)


def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    model_name = sys.argv[3] if len(sys.argv) > 3 else 'large-v3-turbo'
    name = os.path.splitext(os.path.basename(src))[0]
    os.makedirs(out_dir, exist_ok=True)

    log('Modell laden: ' + model_name)
    model = WhisperModel(model_name, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)

    with zipfile.ZipFile(src) as z:
        parts = sorted(n for n in z.namelist() if n.lower().endswith('.webm'))
        segments = []
        offset = 0.0
        for i, part in enumerate(parts, 1):
            channels = decode_stereo(z.read(part))
            length = len(channels[0]) / SR
            for ch, audio in enumerate(channels):
                segs, _ = model.transcribe(
                    audio, language='en', beam_size=5, vad_filter=True,
                    vad_parameters={'min_silence_duration_ms': 500},
                    condition_on_previous_text=False, initial_prompt=PROMPT)
                for s in segs:
                    text = s.text.strip()
                    if text:
                        segments.append({'start': round(offset + s.start, 2), 'end': round(offset + s.end, 2),
                                         'ch': ch, 'text': text})
            log('%s fertig (%d/%d, bis %d min)' % (part, i, len(parts), (offset + length) // 60))
            offset += length

    segments.sort(key=lambda s: (s['start'], s['ch']))
    with open(os.path.join(out_dir, name + '.json'), 'w', encoding='utf-8') as f:
        json.dump({'source': os.path.basename(src), 'minutes': round(offset / 60, 1), 'segments': segments},
                  f, ensure_ascii=False, indent=1)
    with open(os.path.join(out_dir, name + '.txt'), 'w', encoding='utf-8') as f:
        for s in segments:
            f.write('[%02d:%02d] %s: %s\n' % (s['start'] // 60, s['start'] % 60, 'L' if s['ch'] == 0 else 'R', s['text']))
    log('Fertig: %d Abschnitte, %.1f min' % (len(segments), offset / 60))


if __name__ == '__main__':
    main()
