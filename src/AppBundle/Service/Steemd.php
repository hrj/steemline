<?php

namespace AppBundle\Service;

class Steemd
{
    private $ch;

    function __construct()
    {
        $this->ch = curl_init();
        curl_setopt($this->ch, CURLOPT_URL, 'https://steemd.steemit.com');
        curl_setopt($this->ch, CURLOPT_RETURNTRANSFER, TRUE);
    }

    function __destruct()
    {
        curl_close($this->ch);
    }

    private function json_rpc_body($method, $params)
    {
        $request = array(
            "jsonrpc" => "2.0",
            "method" => $method,
            "params" => $params,
            "id" => 0
        );
        return json_encode($request);
    }

    public function exec($method, $params = array())
    {
        $data = $this->json_rpc_body($method, $params);
        curl_setopt($this->ch, CURLOPT_POSTFIELDS, $data);
        $response = curl_exec($this->ch);
        $response = json_decode($response, true);
        if (array_key_exists('error', $response)) {
            dump($response['error']);
            die();
        }
        return $response['result'];
    }

    public function get_account($account)
    {
        $result = $this->exec('get_accounts', [[$account]]);
        return $result;
    }

    public function get_account_votes($account)
    {
        $result = $this->exec('get_account_votes', [$account]);
        return $result;
    }

    public function get_account_count()
    {
        $result = $this->exec('get_account_count');
        return $result;
    }

    public function get_account_history($account)
    {
        $result = $this->exec('get_account_history', [$account, time() - (60 * 60 * 24 * 365), 10000]);

        return $result;
    }
}