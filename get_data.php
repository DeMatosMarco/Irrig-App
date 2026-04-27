<?php
header('Content-Type: text/plain; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$connexion = new mysqli("localhost", "root", "root", "ue4");

if ($connexion->connect_error) {
    http_response_code(500);
    die("Erreur connexion BDD : " . $connexion->connect_error);
}

if (!isset($_POST['humidite']) || !isset($_POST['temperature'])) {
    http_response_code(400);
    die("Paramètres manquants (humidite, temperature).");
}

$humidite    = (int)  $_POST['humidite'];
$temperature = (float)$_POST['temperature'];

if ($humidite < 0 || $humidite > 100) {
    http_response_code(400);
    die("Humidité hors plage [0-100] : " . $humidite);
}
if ($temperature < -40 || $temperature > 80) {
    http_response_code(400);
    die("Température hors plage [-40,80] : " . $temperature);
}

$stmt = $connexion->prepare(
    "INSERT INTO mesures_sol (temperature, humidite) VALUES (?, ?)"
);
$stmt->bind_param("di", $temperature, $humidite);

if ($stmt->execute()) {
    echo "OK - T:" . $temperature . " H:" . $humidite;
        $nettoyage = $connexion->prepare("
        DELETE FROM mesures_sol 
        WHERE id NOT IN (
            SELECT id FROM (
                SELECT id FROM mesures_sol 
                ORDER BY id DESC 
                LIMIT 30
            ) AS temp_table
        )
    ");
    $nettoyage->execute();
    $nettoyage->close();
} else {
    http_response_code(500);
    echo "Erreur INSERT : " . $stmt->error;
}

$stmt->close();
$connexion->close();
?>
