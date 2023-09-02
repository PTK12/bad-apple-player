import cv2
import numpy
import json

# The video is sourced from https://archive.org/details/TouhouBadApple

def get_frame(video: cv2.VideoCapture, frame_id: int) -> numpy.ndarray:
    video.set(cv2.CAP_PROP_POS_FRAMES, frame_id)
    status, frame = video.read()
    assert status, f"Error at: {frame_id}"
    return frame.mean(2)

def resize_frame(frame: numpy.ndarray, width: int, height: int) -> numpy.ndarray:
    y, x = frame.shape
    cropped_frame = frame[:y // height * height, :x // width * width]
    new_frame = cropped_frame.reshape(height, y // height, width, x // width)
    return new_frame.mean((1, 3))

def encode(frame: numpy.ndarray) -> list:
    new_frame = []
    initial = [0]
    final = [len(frame[0])]
    for row in frame:
        new_row = row[:-1] != row[1:]
        new_frame.append([int(row[0]), initial + [int(i) for i in new_row.nonzero()[0] + 1] + final])
    return new_frame

def write(data: dict) -> None:
    with open("data.json", "w+") as f:
        json.dump(data, f)

def main() -> None:
    video = cv2.VideoCapture("./gen/Touhou - Bad Apple.mp4")
    length = int(video.get(cv2.CAP_PROP_FRAME_COUNT))

    frames = []

    for i in range(length):
        frame = get_frame(video, i)
        frame = resize_frame(frame, 80, 30) > 128
        frame = encode(frame)
        frames.append(frame)

    data = {}
    data["n"] = length
    data["frames"] = frames

    write(data)

main()
