export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: "VELO NERO API router attivo"
  });
}
