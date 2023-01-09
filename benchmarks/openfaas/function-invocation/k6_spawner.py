import argparse
import os
import subprocess

CONTINUE_FILE = "continue"

parser = argparse.ArgumentParser()
parser.add_argument("--id", required=True)
args, unknown = parser.parse_known_args()

id = args.id

file = f"pod-{id}.yaml"
pod_name = f"ever-running-{id}"

try:
    os.remove(CONTINUE_FILE)
except:
    pass

subprocess.run(["kubectl", "apply", "-f", file])

subprocess.run(["kubectl", "exec", "-it", pod_name, "--", "/bin/sh", "-c", "mkdir load-test"])
subprocess.run(
    [
        "kubectl",
        "exec",
        "-it",
        pod_name,
        "--",
        "/bin/sh",
        "-c",
        "gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69",
    ]
)
subprocess.run(
    [
        "kubectl",
        "exec",
        "-it",
        pod_name,
        "--",
        "/bin/sh",
        "-c",
        'echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | tee /etc/apt/sources.list.d/k6.list',
    ]
)
subprocess.run(["kubectl", "exec", "-it", pod_name, "--", "/bin/sh", "-c", "apt-get update"])
subprocess.run(["kubectl", "exec", "-it", pod_name, "--", "/bin/sh", "-c", "apt-get install k6"])
subprocess.run(["kubectl", "cp", ".", f"{pod_name}:/load-test"])

print()
print("Waiting for CONTINUE FILE...\n")

# while True:
#     try:
#         if os.path.exists(CONTINUE_FILE):
#             break
#     except:
#         pass

subprocess.run(
    [
        "kubectl",
        "exec",
        "-it",
        pod_name,
        "--",
        "/bin/sh",
        "-c",
        "k6 run load-test/load_test_tr.js --config load-test/config.json",
    ]
)

subprocess.run(["kubectl", "delete", "pod", pod_name])
