<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

class IsolationTest extends TestCase
{
    private string $baseUrl = 'http://localhost/note-taking-app/php';
    private array $cookieA = [];
    private array $cookieB = [];
    private int $createdNoteId = 0;
    
    private function request(
        string $method, string $path,
        array $body = [], array $cookies = []
    ): array {
        $url = $this->baseUrl . $path;
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

    if (!empty($body)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    if (!empty($cookies)) {
        $cookieStr = implode('; ', array_map(
        fn($k, $v) => "$k=$v", array_keys($cookies), $cookies
    ));
        curl_setopt($ch, CURLOPT_COOKIE, $cookieStr);
    }

    curl_setopt($ch, CURLOPT_HEADER, true);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $hSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);
    $headers = substr($raw, 0, $hSize);
    $rawBody = substr($raw, $hSize);
    $setCookies = [];

    foreach (explode("\n", $headers) as $line) {
        if (stripos($line, 'Set-Cookie:') === 0) {
            $parts = explode(';', trim(substr($line, 11)));
            [$k, $v] = explode('=', $parts[0], 2);
            $setCookies[trim($k)] = trim($v);
    }
}

return [
    'status' => $status,
    'body' => json_decode($rawBody, true) ?? [],
    'cookies' => $setCookies,
];
}

public function testRegistrationRequiresAllFields(): void {
    $res = $this->request('POST', '/register.php', []);
    $this->assertEquals(400, $res['status']);
}

public function testUserACanRegisterAndLogin(): void {
    $this->request('POST', '/register.php', [
    'userName' => 'User A', 'userEmail' => 'phpa@test.com',
    'userPassword' => 'passwordA123',
    ]);

    $res = $this->request('POST', '/login.php', [
        'userEmail' => 'phpa@test.com', 'userPassword' => 'passwordA123',
    ]);
    $this->assertEquals(200, $res['status']);
    $this->cookieA = $res['cookies'];
}

public function testUserBCanRegisterAndLogin(): void {
    $this->request('POST', '/register.php', [
    'userName' => 'User B', 'userEmail' => 'phpb@test.com',
    'userPassword' => 'passwordB123',
    ]);

    $res = $this->request('POST', '/login.php', [
        'userEmail' => 'phpb@test.com', 'userPassword' => 'passwordB123',
    ]);
    $this->assertEquals(200, $res['status']);
    $this->cookieB = $res['cookies'];
    }

public function testUnauthenticatedRequestBlocked(): void {
    $res = $this->request('GET', '/notes.php');
    $this->assertEquals(401, $res['status']);
}

public function testUserACreatesNote(): void {
    $res = $this->request('POST', '/notes.php', [
    'noteTitle' => 'User A Secret Note',
    'noteBody' => 'This belongs only to User A.',
], $this->cookieA);
    $this->assertEquals(201, $res['status']);
    $this->assertArrayHasKey('noteId', $res['body']);
    $this->createdNoteId = $res['body']['noteId'];
}

public function testUserAReadsOwnNote(): void {
    $res = $this->request('GET', '/notes.php?noteId=' . $this->createdNoteId,
    [], $this->cookieA);
    $this->assertEquals(200, $res['status']);
    $this->assertEquals('User A Secret Note', $res['body']['noteTitle']);
}

public function testUserBCannotReadUserANote(): void {
    $res = $this->request('GET', '/notes.php?noteId=' . $this->createdNoteId,
    [], $this->cookieB);
    $this->assertEquals(404, $res['status']);
}

public function testUserBCannotUpdateUserANote(): void {
    $res = $this->request('PUT', '/notes.php?noteId=' . $this->createdNoteId,
    ['noteTitle' => 'Hijacked', 'noteBody' => 'Malicious.'],
    $this->cookieB);
    $this->assertEquals(404, $res['status']);
}

public function testUserBCannotDeleteUserANote(): void {
    $res = $this->request('DELETE', '/notes.php?noteId=' . $this->createdNoteId,
    [], $this->cookieB);
    $this->assertEquals(404, $res['status']);
}

public function testUserBListDoesNotContainUserANote(): void {
    $res = $this->request('GET', '/notes.php', [], $this->cookieB);
    $ids = array_column($res['body'], 'noteId');
    $this->assertNotContains($this->createdNoteId, $ids);
}

public function testUserAUpdatesOwnNote(): void {
    $res = $this->request('PUT', '/notes.php?noteId=' . $this->createdNoteId,
    ['noteTitle' => 'Updated Title', 'noteBody' => 'Updated body.',
    'isPinned' => true],
    $this->cookieA);
    $this->assertEquals(200, $res['status']);
}

public function testUpdatedNoteReflectsChanges(): void {
    $res = $this->request('GET', '/notes.php?noteId=' . $this->createdNoteId,
    [], $this->cookieA);
    $this->assertEquals('Updated Title', $res['body']['noteTitle']);
    $this->assertEquals(1, $res['body']['isPinned']);
}

public function testUserADeletesOwnNote(): void {
    $res = $this->request('DELETE', '/notes.php?noteId=' . $this->createdNoteId,
    [], $this->cookieA);
    $this->assertEquals(200, $res['status']);
}

public function testDeletedNoteReturns404(): void {
    $res = $this->request('GET', '/notes.php?noteId=' . $this->createdNoteId,
    [], $this->cookieA);
    $this->assertEquals(404, $res['status']);
}
}