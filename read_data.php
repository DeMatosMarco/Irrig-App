<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$connexion = new mysqli("localhost", "root", "root", "ue4");

if ($connexion->connect_error) {
    http_response_code(500);
    echo json_encode(["erreur" => "Connexion BDD impossible"]);
    exit();
}

$resultat = $connexion->query(
    "SELECT temperature, humidite, date_enregistrement 
     FROM mesures_sol 
     ORDER BY id DESC 
     LIMIT 1"
);

if ($resultat && $resultat->num_rows > 0) {
    $ligne = $resultat->fetch_assoc();
    echo json_encode([
        "soil"      => (int)   $ligne['humidite'],
        "temp"      => (float) $ligne['temperature'],
        "timestamp" => $ligne['date_enregistrement']
    ]);
} else {
    echo json_encode(["soil" => 0, "temp" => 0, "timestamp" => null]);
}

$connexion->close();
?>
