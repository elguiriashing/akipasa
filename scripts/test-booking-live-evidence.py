"""Execute the live smoke script against disposable HTTP responses."""
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

WORKFLOW = Path(__file__).resolve().parents[1] / ".github/workflows/booking-live-smoke.yml"


def smoke_source():
    source = WORKFLOW.read_text().split("python - <<'PY'\n", 1)[1].split("\n          PY", 1)[0]
    return "\n".join(line[10:] for line in source.splitlines())


class Response:
    status = 200

    def __init__(self, url, marker, protected_redirect=True):
        self.url = url
        self.marker = marker
        self.protected_redirect = protected_redirect

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def geturl(self):
        if self.protected_redirect and ("/account/bookings" in self.url or self.url.endswith("/book")):
            return "https://akipasa.com/es/auth" if "/es/" in self.url else "https://akipasa.com/en/auth"
        return self.url

    def read(self):
        return json.dumps({"release": self.marker}).encode()


class SmokeEvidenceTests(unittest.TestCase):
    def execute(self, marker="2026-10-09-booking-ux-r1", protected_redirect=True):
        with tempfile.TemporaryDirectory() as directory:
            evidence_file = Path(directory) / "evidence.json"
            real_path = Path
            # Immediate success uses two clock reads; a mismatch reaches the deadline.
            ticks = iter([0, 0, 1, 2, 1000])
            def clock():
                return next(ticks, 1000)
            def fetch(request, timeout):
                self.assertEqual(timeout, 25)
                return Response(request.full_url, marker, protected_redirect)
            with patch("urllib.request.urlopen", fetch), patch("time.time", clock), patch("time.sleep"), patch("pathlib.Path", lambda _: real_path(evidence_file)), contextlib.redirect_stdout(io.StringIO()):
                failed = False
                try:
                    exec(compile(smoke_source(), str(WORKFLOW), "exec"), {})
                except SystemExit:
                    failed = True
            return failed, json.loads(evidence_file.read_text())

    def test_static_marker_never_verifies_deployed_commit(self):
        failed, evidence = self.execute()
        self.assertFalse(failed)
        self.assertTrue(evidence["feature_release_verified"])
        self.assertFalse(evidence["deployment_source_verified"])
        self.assertIsNone(evidence["deployed_source_commit"])
        self.assertNotIn("application_release_commit", evidence)
        self.assertNotIn("edge_release_verified", evidence)
        self.assertEqual(len(evidence["checks"]), 12)

    def test_wrong_feature_marker_still_fails(self):
        failed, evidence = self.execute(marker="older-release")
        self.assertTrue(failed)
        self.assertFalse(evidence["feature_release_verified"])

    def test_protected_routes_must_still_redirect_to_auth(self):
        failed, evidence = self.execute(protected_redirect=False)
        self.assertTrue(failed)
        self.assertTrue(any(check.get("healthy") is False for check in evidence["checks"]))


if __name__ == "__main__":
    unittest.main()
